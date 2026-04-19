-- seed_prescription_library.sql
-- Founder-led v1 global prescription library
-- Version: 1.0.0-founder

BEGIN;

INSERT INTO prescription_library (
    id,
    org_id,
    version,
    title,
    objective,
    measurable_outcome,
    implementation_notes,
    domain,
    severity,
    track,
    time_horizon,
    sequence_order,
    active,
    tags,
    created_at,
    updated_at
)
VALUES

-- LEADERSHIP

('11111111-1111-1111-1111-111111111001', NULL, '1.0.0-founder',
 'Execution Ownership Reset',
 'Assign a single accountable owner to each of the top 3 strategic initiatives.',
 '100% of active strategic initiatives have one named accountable owner; initiative slippage ≤ 66% next quarter.',
 NULL,
 'leadership', 'critical', 'stabilization',
 30, 1, true, ARRAY['ownership','accountability','slippage'], now(), now()),

('11111111-1111-1111-1111-111111111002', NULL, '1.0.0-founder',
 'Leadership Intervention Audit',
 'Document instances where leadership intervened operationally in the past 30 days.',
 'Reduce leadership unplanned intervention frequency to occasional or lower.',
 NULL,
 'leadership', 'at_risk', 'correction',
 30, 2, true, ARRAY['bandwidth','intervention','leadership'], now(), now()),

('11111111-1111-1111-1111-111111111003', NULL, '1.0.0-founder',
 'Decision Escalation Protocol',
 'Define escalation thresholds for decisions exceeding 5 business days.',
 'Average decision cycle time ≤ 5 business days.',
 NULL,
 'leadership', 'at_risk', 'correction',
 60, 3, true, ARRAY['decision','sla','governance'], now(), now()),

('11111111-1111-1111-1111-111111111004', NULL, '1.0.0-founder',
 'Leadership Capacity Allocation Model',
 'Reallocate executive time toward forward-looking initiatives.',
 '≥ 60% of leadership time allocated to strategic initiatives.',
 NULL,
 'leadership', 'watch', 'optimization',
 90, 4, true, ARRAY['capacity','allocation','strategy'], now(), now()),

-- STRATEGY

('22222222-2222-2222-2222-222222222001', NULL, '1.0.0-founder',
 'Initiative Reduction Mandate',
 'Reduce active strategic initiatives to no more than three.',
 '≤ 3 active initiatives; slippage reduced by ≥ 33% next quarter.',
 NULL,
 'strategy', 'critical', 'stabilization',
 30, 1, true, ARRAY['focus','prioritization','slippage'], now(), now()),

('22222222-2222-2222-2222-222222222002', NULL, '1.0.0-founder',
 'Strategic Clarity Brief',
 'Create a one-page strategic priority brief circulated company-wide.',
 'Decision cycle time ≤ 7 days for priority-aligned initiatives.',
 NULL,
 'strategy', 'at_risk', 'correction',
 30, 2, true, ARRAY['clarity','alignment'], now(), now()),

('22222222-2222-2222-2222-222222222003', NULL, '1.0.0-founder',
 'Quarterly Initiative Scorecard',
 'Implement measurable milestones for each strategic initiative.',
 '≥ 66% of strategic milestones delivered on time.',
 NULL,
 'strategy', 'at_risk', 'correction',
 60, 3, true, ARRAY['milestones','tracking'], now(), now()),

('22222222-2222-2222-2222-222222222004', NULL, '1.0.0-founder',
 'Strategic Review Cadence Installation',
 'Establish recurring quarterly strategic review session.',
 'Strategic initiative slippage ≤ 33% across two consecutive quarters.',
 NULL,
 'strategy', 'watch', 'reinforcement',
 90, 4, true, ARRAY['cadence','review','quarterly'], now(), now()),

-- OPERATIONS

('33333333-3333-3333-3333-333333333001', NULL, '1.0.0-founder',
 'Workflow Bottleneck Mapping',
 'Identify top 3 execution bottlenecks affecting delivery timelines.',
 'Decision cycle time reduced by ≥ 20% within 60 days.',
 NULL,
 'operations', 'critical', 'stabilization',
 30, 1, true, ARRAY['workflow','bottleneck'], now(), now()),

('33333333-3333-3333-3333-333333333002', NULL, '1.0.0-founder',
 'Weekly Execution Review',
 'Install structured weekly review focused on strategic execution progress.',
 '≥ 90% attendance; slippage rate improved quarter-over-quarter.',
 NULL,
 'operations', 'at_risk', 'correction',
 30, 2, true, ARRAY['review','cadence'], now(), now()),

('33333333-3333-3333-3333-333333333003', NULL, '1.0.0-founder',
 'Decision SLA Policy',
 'Implement internal SLA for high-impact decisions.',
 'Average decision cycle time ≤ 5 business days.',
 NULL,
 'operations', 'at_risk', 'correction',
 60, 3, true, ARRAY['decision','sla'], now(), now()),

('33333333-3333-3333-3333-333333333004', NULL, '1.0.0-founder',
 'Execution Metrics Dashboard',
 'Publish dashboard tracking initiative status and decision latency.',
 'Leadership intervention frequency reduced to occasional or lower.',
 NULL,
 'operations', 'watch', 'optimization',
 90, 4, true, ARRAY['dashboard','metrics'], now(), now()),

-- CULTURE

('44444444-4444-4444-4444-444444444001', NULL, '1.0.0-founder',
 'Accountability Alignment Reset',
 'Clarify accountability boundaries across leadership layers.',
 'Leadership unplanned intervention reduced by ≥ 30% next quarter.',
 NULL,
 'culture', 'critical', 'stabilization',
 30, 1, true, ARRAY['accountability','alignment'], now(), now()),

('44444444-4444-4444-4444-444444444002', NULL, '1.0.0-founder',
 'Decision Transparency Log',
 'Create shared decision log accessible across management.',
 'Decision cycle time ≤ 7 days consistently.',
 NULL,
 'culture', 'at_risk', 'correction',
 30, 2, true, ARRAY['transparency','decision'], now(), now()),

('44444444-4444-4444-4444-444444444003', NULL, '1.0.0-founder',
 'Initiative Ownership Visibility',
 'Publish initiative owners and status internally.',
 '≥ 66% of initiatives delivered on schedule.',
 NULL,
 'culture', 'at_risk', 'correction',
 60, 3, true, ARRAY['visibility','ownership'], now(), now()),

('44444444-4444-4444-4444-444444444004', NULL, '1.0.0-founder',
 'Execution Discipline Standard',
 'Codify execution expectations into written operating standard.',
 'Two consecutive quarters with slippage ≤ 33%.',
 NULL,
 'culture', 'watch', 'reinforcement',
 90, 4, true, ARRAY['discipline','standards'], now(), now())

ON CONFLICT (id) DO UPDATE
SET
    title = EXCLUDED.title,
    objective = EXCLUDED.objective,
    measurable_outcome = EXCLUDED.measurable_outcome,
    implementation_notes = EXCLUDED.implementation_notes,
    updated_at = now();

COMMIT;