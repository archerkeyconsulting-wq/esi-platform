// pages/api/assessments/[id]/score.ts
// API route for scoring an assessment (transactional)

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { calculateScore, ScoringModel } from '../../../lib/scoring-engine';
import { selectPrescriptions, PrescriptionRules } from '../../../lib/prescription-engine';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const assessmentId = id as string;

  try {
    // Fetch assessment and related data
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_versions!inner(*),
        responses(*)
      `)
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Fetch latest model version (or specific if provided)
    const { data: modelVersion, error: modelError } = await supabase
      .from('model_versions')
      .select('*')
      .eq('org_id', assessment.org_id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (modelError || !modelVersion) {
      return res.status(404).json({ error: 'Model version not found' });
    }

    // Fetch prescription rules (assuming stored in DB or config)
    // For now, using example; in prod, fetch from DB
    const rules: PrescriptionRules = {
      assessment_version: assessment.assessment_versions.version,
      model_version: modelVersion.version,
      rules: [] // Populate with actual rules
    };

    // Prepare inputs
    const responses = assessment.responses.map((r: any) => ({
      question_key: r.question_key,
      answer: r.answer
    }));

    const model: ScoringModel = {
      version: modelVersion.version,
      domainMapping: {}, // Populate from assessment_versions.schema_json
      weightConfig: modelVersion.model_data, // Assuming stored as JSON
      riskThresholds: {}, // Populate
      confidenceParams: { completionWeight: 0.7, variancePenalty: 0.3 }
    };

    // Calculate scores (pure function)
    const result = calculateScore(responses, model);

    // Select prescriptions (pure function)
    const prescriptions = selectPrescriptions({
      domain_scores: result.domainScores,
      risk_band: result.riskBand,
      lowest_scoring_domain: Object.entries(result.domainScores).reduce((a, b) => result.domainScores[a[0]] < result.domainScores[b[0]] ? a : b)[0],
      assessment_version: assessment.assessment_versions.version,
      model_version: modelVersion.version
    }, rules);

    // Transactional insert
    const { data: runId, error: runError } = await supabase.rpc('score_assessment_transactional', {
      p_assessment_id: assessmentId,
      p_model_version_id: modelVersion.id,
      p_composite_score: result.compositeScore,
      p_risk_band: result.riskBand,
      p_confidence_index: result.confidenceIndex,
      p_domain_scores: result.domainScores,
      p_prescriptions: prescriptions.prescriptions
    });

    if (runError) {
      throw runError;
    }

    res.status(200).json({ runId, result, prescriptions });
  } catch (error) {
    console.error('Scoring error:', error);
    res.status(500).json({ error: 'Failed to score assessment' });
  }
}