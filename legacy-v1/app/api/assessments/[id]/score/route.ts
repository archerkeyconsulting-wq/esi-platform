import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateScore, type ScoringModel, type Response } from '@/scoring-engine'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const assessmentId = params.id

  try {
    // Fetch assessment with related data
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_versions!inner(*),
        responses(*)
      `)
      .eq('id', assessmentId)
      .single()

    if (assessError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Fetch latest model version
    const { data: modelVersion, error: modelError } = await supabase
      .from('model_versions')
      .select('*')
      .eq('org_id', assessment.org_id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (modelError || !modelVersion) {
      return NextResponse.json(
        { error: 'Model version not found' },
        { status: 404 }
      )
    }

    // Prepare responses for scoring
    const responses: Response[] = assessment.responses.map((r: any) => ({
      question_key: r.question_key,
      answer: typeof r.answer === 'number' ? r.answer : Number(r.answer) || 0,
    }))

    // Build scoring model from stored configuration
    const assessmentSchema = assessment.assessment_versions.schema_json
    const domainMapping: Record<string, string[]> = {}

    // Build domain mapping from questions
    if (assessmentSchema.questions) {
      assessmentSchema.questions.forEach((q: any) => {
        if (!domainMapping[q.domain]) {
          domainMapping[q.domain] = []
        }
        domainMapping[q.domain].push(q.key)
      })
    }

    const model: ScoringModel = {
      version: modelVersion.version,
      domainMapping,
      weightConfig: modelVersion.model_data || {
        domains: {
          decisions: 0.2,
          accountability: 0.25,
          escalation: 0.2,
          resource_flow: 0.2,
          feedback: 0.15,
        },
      },
      riskThresholds: {
        stable: { min: 70, max: 100 },
        emerging_strain: { min: 50, max: 69 },
        structural_friction: { min: 30, max: 49 },
        systemic_breakdown: { min: 0, max: 29 },
      },
      confidenceParams: {
        completionWeight: 0.7,
        variancePenalty: 0.3,
      },
      scale: {
        min: 1,
        max: 5,
      },
    }

    // Calculate scores
    const result = calculateScore(responses, model)

    // Create assessment run
    const { data: run, error: runError } = await supabase
      .from('assessment_runs')
      .insert({
        org_id: assessment.org_id,
        assessment_id: assessmentId,
        model_version_id: modelVersion.id,
        status: 'completed',
      })
      .select()
      .single()

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Failed to create assessment run' },
        { status: 500 }
      )
    }

    // Store domain scores
    const domainScoreInserts = Object.entries(result.domainScores).map(([domain, score]) => ({
      assessment_id: assessmentId,
      model_version_id: modelVersion.id,
      assessment_run_id: run.id,
      domain,
      score,
      confidence: result.confidenceIndex,
    }))

    const { error: domainError } = await supabase
      .from('domain_scores')
      .insert(domainScoreInserts)

    if (domainError) {
      return NextResponse.json(
        { error: 'Failed to store domain scores' },
        { status: 500 }
      )
    }

    // Store risk classification
    const { error: riskError } = await supabase
      .from('risk_classifications')
      .insert({
        assessment_id: assessmentId,
        model_version_id: modelVersion.id,
        assessment_run_id: run.id,
        classification: result.riskBand,
        severity_score: result.compositeScore,
      })

    if (riskError) {
      return NextResponse.json(
        { error: 'Failed to store risk classification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      result,
      runId: run.id,
    })
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json(
      { error: 'Failed to score assessment' },
      { status: 500 }
    )
  }
}
