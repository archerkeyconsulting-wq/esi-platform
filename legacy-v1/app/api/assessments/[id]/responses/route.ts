import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const assessmentId = params.id

  try {
    const body = await request.json()
    const { question_key, answer } = body

    if (!question_key || answer === undefined) {
      return NextResponse.json(
        { error: 'Missing question_key or answer' },
        { status: 400 }
      )
    }

    // Convert answer to appropriate type
    let parsedAnswer = answer
    if (typeof answer === 'string') {
      const num = Number(answer)
      if (!isNaN(num)) {
        parsedAnswer = num
      }
    }

    // Upsert response (insert or update)
    const { data: response, error } = await supabase
      .from('responses')
      .upsert({
        assessment_id: assessmentId,
        question_key,
        answer: parsedAnswer,
      })
      .select()
      .single()

    if (error || !response) {
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      response_id: response.id,
    })
  } catch (error) {
    console.error('Error saving response:', error)
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    )
  }
}
