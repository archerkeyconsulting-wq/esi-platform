import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { assessment_version_id, org_id, user_id } = await request.json()

    if (!assessment_version_id || !org_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create assessment
    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert({
        org_id,
        user_id,
        assessment_version_id,
        period: new Date().toISOString().split('T')[0],
        status: 'in_progress',
      })
      .select()
      .single()

    if (error || !assessment) {
      return NextResponse.json(
        { error: 'Failed to create assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: assessment.id,
      status: assessment.status,
      created_at: assessment.created_at,
    })
  } catch (error) {
    console.error('Error creating assessment:', error)
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    )
  }
}
