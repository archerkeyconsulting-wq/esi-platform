// prescription-engine.ts
// Deterministic, rule-based prescription engine for ESI
// Founder-led (20–100 employees) v1 logic
// Pure function. No DB calls. No side effects.

export type RiskBand =
  | "stable"
  | "emerging_strain"
  | "structural_friction"
  | "systemic_breakdown";

export type SeverityBucket = "critical" | "at_risk" | "watch";

export type MacroTrack =
  | "stabilization"
  | "correction"
  | "optimization"
  | "reinforcement";

export interface PrescriptionLibraryItem {
  id: string;
  domain: string;
  severity: SeverityBucket;
  track: MacroTrack;
  title: string;
  objective: string;
  measurableOutcome: string;
  timeHorizon: 30 | 60 | 90;
  sequenceOrder: number;
  version: string;
  active: boolean;
}

export interface PrescriptionResult {
  id: string;
  title: string;
  objective: string;
  measurableOutcome: string;
  timeHorizon: 30 | 60 | 90;
  sequenceOrder: number;
}

export interface PrescriptionEngineInput {
  domainScores: Record<string, number>;
  compositeScore: number;
  riskBand: RiskBand;
  modelVersion: string;
  library: PrescriptionLibraryItem[];
}

export interface PrescriptionEngineOutput {
  macroTrack: MacroTrack;
  activatedDomains: string[];
  prescriptions: PrescriptionResult[];
}

function determineMacroTrack(riskBand: RiskBand): MacroTrack {
  switch (riskBand) {
    case "systemic_breakdown":
      return "stabilization";
    case "structural_friction":
      return "correction";
    case "emerging_strain":
      return "optimization";
    case "stable":
      return "reinforcement";
  }
}

function determineSeverity(score: number): SeverityBucket {
  if (score < 45) return "critical";
  if (score < 60) return "at_risk";
  return "watch";
}

export function generatePrescriptions(
  input: PrescriptionEngineInput
): PrescriptionEngineOutput {
  const { domainScores, riskBand, library } = input;

  const macroTrack = determineMacroTrack(riskBand);

  // Sort domains ascending by score
  const sortedDomains = Object.entries(domainScores).sort(
    (a, b) => a[1] - b[1]
  );

  // Special case: For stable companies with all domains >= 75, only show reinforcement (max 2)
  const lowestScore = sortedDomains[0]?.[1] ?? 100;
  if (riskBand === "stable" && lowestScore >= 75) {
    const reinforcementPrescriptions = library
      .filter(item => item.active && item.track === "reinforcement")
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .slice(0, 2)
      .map(item => ({
        id: item.id,
        title: item.title,
        objective: item.objective,
        measurableOutcome: item.measurableOutcome,
        timeHorizon: item.timeHorizon,
        sequenceOrder: item.sequenceOrder,
      }));

    return {
      macroTrack,
      activatedDomains: [],
      prescriptions: reinforcementPrescriptions,
    };
  }

  // Activate domains:
  // - Always lowest
  // - Any domain < 50
  // - Max 3 domains
  const activatedDomains: string[] = [];

  for (const [domain, score] of sortedDomains) {
    if (
      activatedDomains.length === 0 ||
      score < 50
    ) {
      activatedDomains.push(domain);
    }

    if (activatedDomains.length >= 3) break;
  }

  const selected: PrescriptionResult[] = [];

  for (const domain of activatedDomains) {
    const score = domainScores[domain];
    const severity = determineSeverity(score);

    let matches = library
      .filter(
        (item) =>
          item.active &&
          item.domain === domain &&
          item.severity === severity &&
          item.track === macroTrack
      )
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Fallback logic if no matches
    if (matches.length === 0) {
      // 1. Try domain + severity + "stabilization"
      matches = library
        .filter(
          (item) =>
            item.active &&
            item.domain === domain &&
            item.severity === severity &&
            item.track === "stabilization"
        )
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

      if (matches.length === 0) {
        // 2. Try domain + "at_risk" + "correction"
        matches = library
          .filter(
            (item) =>
              item.active &&
              item.domain === domain &&
              item.severity === "at_risk" &&
              item.track === "correction"
          )
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

        if (matches.length === 0) {
          // 3. Try domain + "watch" + "reinforcement"
          matches = library
            .filter(
              (item) =>
                item.active &&
                item.domain === domain &&
                item.severity === "watch" &&
                item.track === "reinforcement"
            )
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        }
      }
    }

    for (const item of matches) {
      selected.push({
        id: item.id,
        title: item.title,
        objective: item.objective,
        measurableOutcome: item.measurableOutcome,
        timeHorizon: item.timeHorizon,
        sequenceOrder: item.sequenceOrder,
      });
    }
  }

  // Deduplicate by ID
  const unique = Array.from(
    new Map(selected.map((p) => [p.id, p])).values()
  );

  // Limit to max 5 prescriptions
  const limited = unique
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .slice(0, 5);

  return {
    macroTrack,
    activatedDomains,
    prescriptions: limited,
  };
}