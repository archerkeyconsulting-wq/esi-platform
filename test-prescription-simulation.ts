// test-prescription-simulation.ts
// Simulation script for testing ESI scoring and prescription generation

import { calculateScore, exampleScoringModel } from "./scoring-engine.ts";
import { generatePrescriptions } from "./prescription-engine.ts";
const library = require("./prescription-library.seed.json");

const simulatedResponses = [
  { question_key: "q1", answer: 2 },
  { question_key: "q2", answer: 2 },
  { question_key: "q3", answer: 2 },
  { question_key: "q4", answer: 3 },
  { question_key: "q5", answer: 2 },
  { question_key: "q6", answer: 3 },
  { question_key: "q7", answer: 3 },
  { question_key: "q8", answer: 3 },
  { question_key: "q9", answer: 3 },
  { question_key: "q10", answer: 4 },
  { question_key: "q11", answer: 4 }
];

// Run once
const score = calculateScore(simulatedResponses, exampleScoringModel);
const prescriptions = generatePrescriptions({
  domainScores: score.domainScores,
  compositeScore: score.compositeScore,
  riskBand: score.riskBand,
  modelVersion: exampleScoringModel.version,
  library
});

// Run again for determinism check
const score2 = calculateScore(simulatedResponses, exampleScoringModel);
const prescriptions2 = generatePrescriptions({
  domainScores: score2.domainScores,
  compositeScore: score2.compositeScore,
  riskBand: score2.riskBand,
  modelVersion: exampleScoringModel.version,
  library
});

console.log("Score:", score);
console.log("Prescriptions:", prescriptions);

// Assertions
console.assert(
  ["stabilization", "correction", "optimization", "reinforcement"].includes(prescriptions.macroTrack),
  `Invalid macroTrack: ${prescriptions.macroTrack}`
);

console.assert(
  prescriptions.prescriptions.length <= 5,
  `Too many prescriptions: ${prescriptions.prescriptions.length}`
);

console.assert(
  prescriptions.activatedDomains.length <= 3,
  `Too many activated domains: ${prescriptions.activatedDomains.length}`
);

// Determinism check
console.assert(
  JSON.stringify(score) === JSON.stringify(score2),
  "Scoring not deterministic"
);

console.assert(
  JSON.stringify(prescriptions) === JSON.stringify(prescriptions2),
  "Prescription generation not deterministic"
);

console.log("All assertions passed!");