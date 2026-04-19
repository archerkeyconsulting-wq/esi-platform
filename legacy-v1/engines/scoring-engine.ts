// scoring-engine.ts
// Deterministic scoring engine for ESI (Execution Systems Index)
// Pure functional, no side effects, version-aware

export interface Response {
  question_key: string;
  answer: number; // Assumed to be a numeric score, e.g., 1-5 Likert scale
}

export interface DomainMapping {
  [domain: string]: string[]; // Maps domain names to arrays of question keys
}

export interface WeightConfig {
  domains: { [domain: string]: number }; // Weights for domains (should sum to 1.0 for composite)
  questions?: { [question_key: string]: number }; // Optional per-question weights within domains
}

export interface ScoringModel {
  version: string;
  domainMapping: DomainMapping;
  weightConfig: WeightConfig;
  riskThresholds: {
    stable: { min: number; max: number };
    emerging_strain: { min: number; max: number };
    structural_friction: { min: number; max: number };
    systemic_breakdown: { min: number; max: number };
  };
  confidenceParams: {
    completionWeight: number; // e.g., 0.7
    variancePenalty: number; // e.g., 0.3
  };
  scale: {
    min: number; // e.g., 1
    max: number; // e.g., 5
  };
}

export interface ScoringResult {
  domainScores: { [domain: string]: number }; // 0-100 scale
  compositeScore: number; // 0-100 scale
  riskBand: 'stable' | 'emerging_strain' | 'structural_friction' | 'systemic_breakdown';
  confidenceIndex: number; // 0-100 scale
}

/**
 * Calculates domain scores, composite score, risk band, and confidence index.
 * Pure function: no side effects, deterministic output based on inputs.
 */
export function calculateScore(responses: Response[], model: ScoringModel): ScoringResult {
  // Create a map of responses for quick lookup (handles duplicates by taking last)
  const responseMap = new Map<string, number>();
  for (const r of responses) {
    responseMap.set(r.question_key, r.answer);
  }

  // Calculate total unique questions for completion rate
  const allQuestionKeys = Array.from(
    new Set(Object.values(model.domainMapping).flat())
  );
  const totalQuestions = allQuestionKeys.length;

  // Calculate completion rate (unique answered keys)
  const completionRate = responseMap.size / totalQuestions;

  // Calculate domain coverage (fraction of domains with at least one answer)
  const answeredKeys = new Set(responseMap.keys());
  const domainsAnswered = Object.entries(model.domainMapping).filter(
    ([_, keys]) => keys.some(key => answeredKeys.has(key))
  ).length;
  const totalDomains = Object.keys(model.domainMapping).length;
  const domainCoverage = domainsAnswered / totalDomains;

  // Collect all answers for variance calculation
  const allAnswers = Array.from(responseMap.values());

  // Collect all answers for variance calculation
  const allAnswers = responses.map(r => r.answer);

  // Calculate mean and variance
  const mean = allAnswers.length > 0 ? allAnswers.reduce((sum, val) => sum + val, 0) / allAnswers.length : 0;
  const variance = allAnswers.length > 1
    ? allAnswers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (allAnswers.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);

  // Normalize stdDev to 0-1 (based on model scale)
  const maxStdDev = (model.scale.max - model.scale.min) / 2;
  const normalizedVariance = Math.min(stdDev / maxStdDev, 1);

  // Confidence index: weighted combination of completion, inverse variance, and domain coverage
  const baseConfidence = completionRate * model.confidenceParams.completionWeight +
    (1 - normalizedVariance) * model.confidenceParams.variancePenalty;
  const confidenceIndex = Math.round(baseConfidence * domainCoverage * 100);

  // Calculate domain scores
  const domainScores: { [domain: string]: number } = {};
  for (const [domain, questionKeys] of Object.entries(model.domainMapping)) {
    const domainResponses = questionKeys
      .map(key => responseMap.get(key))
      .filter((answer): answer is number => answer !== undefined);

    if (domainResponses.length === 0) {
      domainScores[domain] = 0;
      continue;
    }

    let domainScore: number;
    if (model.weightConfig.questions) {
      // Weighted average per question
      const totalWeight = questionKeys.reduce((sum, key) => sum + (model.weightConfig.questions![key] || 1), 0);
      const weightedSum = questionKeys.reduce((sum, key) => {
        const answer = responseMap.get(key);
        const weight = model.weightConfig.questions![key] || 1;
        return answer !== undefined ? sum + (answer * weight) : sum;
      }, 0);
      domainScore = totalWeight > 0 ? (weightedSum / totalWeight) * 20 : 0; // Assuming 1-5 scale, convert to 0-100
    } else {
      // Simple average
      const sum = domainResponses.reduce((a, b) => a + b, 0);
      domainScore = (sum / domainResponses.length) * 20; // 1-5 to 0-100
    }

    domainScores[domain] = Math.round(Math.max(0, Math.min(100, domainScore)));
  }

  // Calculate composite score
  const totalDomainWeight = Object.values(model.weightConfig.domains).reduce((sum, w) => sum + w, 0);
  const compositeScore = totalDomainWeight > 0
    ? Object.entries(domainScores).reduce((sum, [domain, score]) => {
        const weight = model.weightConfig.domains[domain] || 0;
        return sum + (score * weight);
      }, 0) / totalDomainWeight
    : 0;

  const roundedComposite = Math.round(Math.max(0, Math.min(100, compositeScore)));

  // Determine risk band
  let riskBand: ScoringResult['riskBand'] = 'stable';
  for (const [band, threshold] of Object.entries(model.riskThresholds)) {
    if (roundedComposite >= threshold.min && roundedComposite <= threshold.max) {
      riskBand = band as ScoringResult['riskBand'];
      break;
    }
  }

  return {
    domainScores,
    compositeScore: roundedComposite,
    riskBand,
    confidenceIndex: Math.max(0, Math.min(100, confidenceIndex))
  };
}

// Example configuration
export const exampleScoringModel: ScoringModel = {
  version: "1.0.0",
  domainMapping: {
    leadership: ["q1", "q2", "q3"],
    strategy: ["q4", "q5"],
    operations: ["q6", "q7", "q8", "q9"],
    culture: ["q10", "q11"]
  },
  weightConfig: {
    domains: {
      leadership: 0.3,
      strategy: 0.25,
      operations: 0.25,
      culture: 0.2
    },
    questions: {
      q1: 1.5, // Higher weight for critical questions
      q2: 1.0,
      q3: 1.0,
      q4: 1.2,
      q5: 1.0,
      q6: 1.0,
      q7: 1.0,
      q8: 1.0,
      q9: 1.0,
      q10: 1.0,
      q11: 1.0
    }
  },
  riskThresholds: {
    stable: { min: 80, max: 100 },
    emerging_strain: { min: 60, max: 79 },
    structural_friction: { min: 40, max: 59 },
    systemic_breakdown: { min: 0, max: 39 }
  },
  confidenceParams: {
    completionWeight: 0.7,
    variancePenalty: 0.3
  },
  scale: {
    min: 1,
    max: 5
  }
};

// Unit test examples (using a testing framework like Jest)
// These are example test cases - in a real setup, you'd put them in a separate test file

/*
describe('calculateScore', () => {
  it('should calculate scores correctly for complete responses', () => {
    const responses: Response[] = [
      { question_key: 'q1', answer: 5 },
      { question_key: 'q2', answer: 4 },
      { question_key: 'q3', answer: 5 },
      { question_key: 'q4', answer: 4 },
      { question_key: 'q5', answer: 3 },
      { question_key: 'q6', answer: 5 },
      { question_key: 'q7', answer: 4 },
      { question_key: 'q8', answer: 5 },
      { question_key: 'q9', answer: 4 },
      { question_key: 'q10', answer: 5 },
      { question_key: 'q11', answer: 4 }
    ];

    const result = calculateScore(responses, exampleScoringModel);

    expect(result.compositeScore).toBeGreaterThan(80);
    expect(result.riskBand).toBe('stable');
    expect(result.confidenceIndex).toBe(100); // Complete, low variance
    expect(result.domainScores.leadership).toBeDefined();
  });

  it('should handle partial responses', () => {
    const responses: Response[] = [
      { question_key: 'q1', answer: 3 },
      { question_key: 'q2', answer: 2 }
    ];

    const result = calculateScore(responses, exampleScoringModel);

    expect(result.compositeScore).toBeGreaterThan(0);
    expect(result.confidenceIndex).toBeLessThan(100); // Incomplete
  });

  it('should be deterministic', () => {
    const responses: Response[] = [
      { question_key: 'q1', answer: 4 },
      { question_key: 'q2', answer: 3 }
    ];

    const result1 = calculateScore(responses, exampleScoringModel);
    const result2 = calculateScore(responses, exampleScoringModel);

    expect(result1).toEqual(result2);
  });

  it('should classify risk bands correctly', () => {
    const lowResponses: Response[] = [
      { question_key: 'q1', answer: 1 },
      { question_key: 'q2', answer: 1 },
      { question_key: 'q3', answer: 1 },
      { question_key: 'q4', answer: 1 },
      { question_key: 'q5', answer: 1 },
      { question_key: 'q6', answer: 1 },
      { question_key: 'q7', answer: 1 },
      { question_key: 'q8', answer: 1 },
      { question_key: 'q9', answer: 1 },
      { question_key: 'q10', answer: 1 },
      { question_key: 'q11', answer: 1 }
    ];

    const result = calculateScore(lowResponses, exampleScoringModel);

    expect(result.riskBand).toBe('systemic_breakdown');
  });
});
*/