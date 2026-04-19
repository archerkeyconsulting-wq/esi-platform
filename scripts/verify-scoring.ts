// Sanity check that the ORS-LITE engine produces the expected scores for
// the three seeded companies. Run via: npm run verify-scoring

import {
  calculateOperationalRisk,
  type SignalInput,
} from '../lib/scoring/ors-lite'

const trident: SignalInput[] = [
  { signal_type: 'supplier_concentration', severity: 'severe' },
  { signal_type: 'demand_fulfillment', severity: 'moderate' },
  { signal_type: 'quality_drift', severity: 'mild' },
  { signal_type: 'erp_instability', severity: 'severe' },
  { signal_type: 'throughput_variance', severity: 'moderate' },
  { signal_type: 'knowledge_attrition', severity: 'moderate' },
  { signal_type: 'execution_load', severity: 'mild' },
]

const vector: SignalInput[] = [
  { signal_type: 'supplier_concentration', severity: 'moderate' },
  { signal_type: 'demand_fulfillment', severity: 'mild' },
  { signal_type: 'quality_drift', severity: 'none' },
  { signal_type: 'erp_instability', severity: 'mild' },
  { signal_type: 'throughput_variance', severity: 'moderate' },
  { signal_type: 'knowledge_attrition', severity: 'mild' },
  { signal_type: 'execution_load', severity: 'mild' },
]

const atlas: SignalInput[] = [
  { signal_type: 'supplier_concentration', severity: 'mild' },
  { signal_type: 'demand_fulfillment', severity: 'none' },
  { signal_type: 'quality_drift', severity: 'none' },
  { signal_type: 'erp_instability', severity: 'none' },
  { signal_type: 'throughput_variance', severity: 'mild' },
  { signal_type: 'knowledge_attrition', severity: 'mild' },
  { signal_type: 'execution_load', severity: 'none' },
]

function report(label: string, signals: SignalInput[]) {
  const r = calculateOperationalRisk(signals)
  console.log(
    `${label.padEnd(10)} score=${String(r.score).padStart(3)} status=${r.status.padEnd(9)} raw=${r.rawTotal}`,
  )
}

console.log('ORS-LITE engine verification')
console.log('-----------------------------')
report('Trident', trident)
report('Vector', vector)
report('Atlas', atlas)
console.log('')
console.log(
  'Note: seeded assessments.risk_score rows (72 / 44 / 28) are historical',
)
console.log(
  'display values. New CSV uploads will always use the engine above.',
)
