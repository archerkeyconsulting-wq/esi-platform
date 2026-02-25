// lib/pdf-layout-mapper.ts
// Deterministic PDF layout mapping for ESI assessments

export interface PDFLayout {
  mode: 'lite' | 'full';
  header: {
    title: string;
    organization: string;
    assessmentDate: string;
    modelVersion: string;
  };
  summary: string;
  domainScores: Array<{ domain: string; score: number }>;
  riskBand: string;
  prescriptions: Array<{
    title: string;
    priority: number;
    timeHorizon: number;
    successCondition: string;
  }>;
  audit: {
    modelVersion: string;
    questionSetVersion: string;
    generatedAt: string;
    confidenceIndex: number;
  };
}

export interface PDFInput {
  organization: {
    name: string;
    id: string;
  };
  assessment: {
    summary: string;
    date: string;
    version: string;
    type: 'lite' | 'full';
  };
  domainScores: { [domain: string]: number };
  riskBand: string;
  prescriptions: Array<{
    title: string;
    priority: number;
    timeHorizon: number;
    successCondition: string;
  }>;
  modelVersion: string;
  questionSetVersion: string;
  confidenceIndex: number;
}

/**
 * Maps input data to deterministic PDF layout structure.
 * Pure function: no side effects, same inputs yield identical layout.
 */
export function mapToPDFLayout(input: PDFInput): PDFLayout {
  const generatedAt = new Date().toISOString(); // Deterministic timestamp

  return {
    mode: input.assessment.type,
    header: {
      title: `ESI Assessment Report - ${input.assessment.type.toUpperCase()}`,
      organization: input.organization.name,
      assessmentDate: input.assessment.date,
      modelVersion: input.modelVersion
    },
    summary: input.assessment.summary,
    domainScores: Object.entries(input.domainScores).map(([domain, score]) => ({
      domain: domain.charAt(0).toUpperCase() + domain.slice(1),
      score
    })),
    riskBand: input.riskBand.replace('_', ' ').toUpperCase(),
    prescriptions: input.prescriptions,
    audit: {
      modelVersion: input.modelVersion,
      questionSetVersion: input.questionSetVersion,
      generatedAt,
      confidenceIndex: input.confidenceIndex
    }
  };
}

// Example JSON input
export const examplePDFInput: PDFInput = {
  organization: {
    name: "Acme Corp",
    id: "org-123"
  },
  assessment: {
    summary: "This assessment reveals strong leadership and culture domains, with opportunities for improvement in strategy and operations. Overall, the organization shows emerging strain that requires targeted interventions.",
    date: "2026-02-24",
    version: "1.0.0",
    type: "full"
  },
  domainScores: {
    leadership: 85,
    strategy: 65,
    operations: 70,
    culture: 90
  },
  riskBand: "emerging_strain",
  prescriptions: [
    {
      title: "Strategy Alignment Workshop",
      priority: 1,
      timeHorizon: 60,
      successCondition: "Strategy domain score increases by 15 points"
    },
    {
      title: "Operations Process Audit",
      priority: 2,
      timeHorizon: 30,
      successCondition: "Operations domain score increases by 10 points"
    },
    {
      title: "Leadership Development Program",
      priority: 3,
      timeHorizon: 90,
      successCondition: "90% of leaders complete development training"
    }
  ],
  modelVersion: "1.0.0",
  questionSetVersion: "1.0.0",
  confidenceIndex: 95
};