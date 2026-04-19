import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const assessmentId = params.id

  try {
    // Fetch assessment with assessment version to get schema
    const { data: assessment, error } = await supabase
      .from('assessments')
      .select(`
        id,
        status,
        assessment_versions!inner(
          id,
          schema_json
        )
      `)
      .eq('id', assessmentId)
      .single()

    if (error || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const schema = assessment.assessment_versions.schema_json
    const questions = schema.questions || []

    return NextResponse.json({
      assessment_id: assessmentId,
      questions,
      total_count: questions.length,
    })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
