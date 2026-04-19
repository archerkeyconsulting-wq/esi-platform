import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const assessmentId = params.id

  try {
    // Fetch assessment and organization data
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select(`
        id,
        created_at,
        organizations(name)
      `)
      .eq('id', assessmentId)
      .single()

    if (assessError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Fetch risk classification
    const { data: risk } = await supabase
      .from('risk_classifications')
      .select('severity_score, classification')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch domain scores
    const { data: scores } = await supabase
      .from('domain_scores')
      .select('domain, score')
      .eq('assessment_id', assessmentId)

    if (!scores) {
      return NextResponse.json({ error: 'Assessment data not found' }, { status: 404 })
    }

    // Calculate data
    const domainMap: Record<string, number> = {}
    let totalScore = 0

    scores.forEach((s: any) => {
      domainMap[s.domain] = s.score
      totalScore += s.score
    })

    const esiScore = risk?.severity_score || totalScore / scores.length
    const topGaps = scores
      .sort((a: any, b: any) => a.score - b.score)
      .slice(0, 3)

    // Generate HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Operations Map - ${assessment.organizations?.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 40px;
    }

    .header {
      border-bottom: 3px solid #FFDE59;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 5px;
    }

    .header p {
      color: #666;
      font-size: 14px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }

    .metric-card {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #FFDE59;
    }

    .metric-card .number {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 5px;
    }

    .metric-card .label {
      font-size: 12px;
      color: #666;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      font-size: 20px;
      margin-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }

    .gap-item {
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin-bottom: 15px;
      background: #fef2f2;
    }

    .gap-item .title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .gap-item .details {
      font-size: 12px;
      color: #666;
      margin-bottom: 10px;
    }

    .bar {
      height: 8px;
      background: #e5e5e5;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: #ef4444;
    }

    .recommendation {
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
    }

    .recommendation h4 {
      margin-bottom: 5px;
      color: #1e40af;
    }

    .recommendation p {
      font-size: 13px;
      color: #333;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 11px;
      color: #999;
    }

    .workflow {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 10px;
    }

    .workflow-step {
      flex: 1;
      background: #FFDE59;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      font-weight: bold;
      font-size: 13px;
    }

    .workflow-arrow {
      font-size: 20px;
      color: #ccc;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    table th {
      background: #f5f5f5;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #e5e5e5;
      font-size: 12px;
    }

    table td {
      padding: 10px;
      border-bottom: 1px solid #e5e5e5;
      font-size: 12px;
    }

    .page-break {
      page-break-before: always;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${assessment.organizations?.name}</h1>
    <p>Operations Map & Execution Analysis</p>
    <p style="font-size: 12px; margin-top: 10px;">Generated: ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="metric-grid">
    <div class="metric-card">
      <div class="number">${Math.round(esiScore)}</div>
      <div class="label">Execution Systems Index</div>
    </div>
    <div class="metric-card">
      <div class="number">${topGaps.length}</div>
      <div class="label">Critical Gaps Identified</div>
    </div>
    <div class="metric-card">
      <div class="number">${Math.round(totalScore / scores.length)}</div>
      <div class="label">Average Signal Score</div>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>
      This organization's execution capability shows ${esiScore >= 70 ? 'strong performance across most signals.' : esiScore >= 50 ? 'mixed execution with some areas needing attention.' : 'significant execution gaps that require intervention.'}
      The ${topGaps[0]?.domain.replace(/_/g, ' ')} signal is the biggest opportunity for improvement.
      Addressing the top 3 gaps could unlock meaningful operational value.
    </p>
  </div>

  <div class="section">
    <h2>Execution Workflow</h2>
    <div class="workflow">
      <div class="workflow-step">Decisions</div>
      <div class="workflow-arrow">→</div>
      <div class="workflow-step">Accountability</div>
      <div class="workflow-arrow">→</div>
      <div class="workflow-step">Execution</div>
      <div class="workflow-arrow">→</div>
      <div class="workflow-step">Outcome</div>
    </div>
  </div>

  <div class="section">
    <h2>Top 3 Execution Gaps</h2>
    ${topGaps
      .map(
        (gap: any, idx: number) => `
      <div class="gap-item">
        <div class="title">#${idx + 1}: ${gap.domain.replace(/_/g, ' ')}</div>
        <div class="details">
          Score: ${Math.round(gap.score)}/100 | Gap: ${100 - Math.round(gap.score)} points |
          Annual Impact: $${((100 - Math.round(gap.score)) * 2.5).toFixed(0)}K
        </div>
        <div class="bar">
          <div class="bar-fill" style="width: ${(gap.score / 100) * 100}%"></div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="section">
    <h2>Recommended Actions</h2>
    <div class="recommendation">
      <h4>🎯 30-Day Priority</h4>
      <p>Focus on ${topGaps[0]?.domain.replace(/_/g, ' ')}. Quick wins in ownership assignment and decision communication can move this signal 10+ points.</p>
    </div>
    <div class="recommendation">
      <h4>📈 60-Day Initiative</h4>
      <p>Implement process improvements for ${topGaps[1]?.domain.replace(/_/g, ' ')}. Often correlated with priority improvements.</p>
    </div>
    <div class="recommendation">
      <h4>✅ 90-Day Check-In</h4>
      <p>Measure progress with a repeat assessment. Target: 10-point improvement on priority signals.</p>
    </div>
  </div>

  <div class="section">
    <h2>All Signal Scores</h2>
    <table>
      <thead>
        <tr>
          <th>Signal</th>
          <th>Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${scores
          .sort((a: any, b: any) => b.score - a.score)
          .map(
            (s: any) => `
          <tr>
            <td>${s.domain.replace(/_/g, ' ')}</td>
            <td>${Math.round(s.score)}/100</td>
            <td>${s.score >= 70 ? '✅ Strong' : s.score >= 50 ? '⚠️ Medium' : '🔴 Weak'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Assessment ID: ${assessmentId}</p>
    <p>This document represents the execution diagnostic for this organization. It should be treated as confidential.</p>
  </div>
</body>
</html>
    `

    // Convert HTML to PDF using a simple approach
    // Note: In production, you might use a library like puppeteer or a service like html2pdf
    // For now, return the HTML for the client to handle PDF conversion, or use a server-side solution

    // Simple approach: return the HTML and let the browser print/save it
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="operations-map-${assessmentId}.html"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate operations map' },
      { status: 500 }
    )
  }
}
