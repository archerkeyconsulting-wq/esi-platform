-- Seed assessment template with 30 questions for NARO MVP
-- Maps to 5 execution signals (6 questions each)

-- First, create demo organization if it doesn't exist
INSERT INTO organizations (name, is_demo)
VALUES ('Demo Organization', true)
ON CONFLICT DO NOTHING;

-- Get the demo org ID
WITH demo_org AS (
  SELECT id FROM organizations WHERE name = 'Demo Organization' LIMIT 1
)

-- Insert assessment version template
INSERT INTO assessment_versions (
  org_id,
  version,
  type,
  title,
  description,
  schema_json
)
SELECT
  demo_org.id,
  '1.0.0',
  'full',
  'Full Execution Assessment',
  'Comprehensive 30-question assessment covering all five execution signals',
  jsonb_build_object(
    'questions', jsonb_build_array(
      -- DECISIONS SIGNAL (6 questions)
      jsonb_build_object(
        'key', 'decision_velocity_1',
        'text', 'How many days typically elapse between when a strategic decision is made and implementation begins?',
        'type', 'radio',
        'domain', 'decisions',
        'options', array['1-2 days', '3-5 days', '5-10 days', '10-15 days', '15+ days']
      ),
      jsonb_build_object(
        'key', 'decision_clarity_1',
        'text', 'When a decision is communicated, how clearly are the expected outcomes defined?',
        'type', 'likert',
        'domain', 'decisions'
      ),
      jsonb_build_object(
        'key', 'decision_propagation_1',
        'text', 'How effectively does decision rationale cascade through the organization?',
        'type', 'likert',
        'domain', 'decisions'
      ),
      jsonb_build_object(
        'key', 'decision_reversal_1',
        'text', 'How often are decisions reversed after being communicated to teams?',
        'type', 'likert',
        'domain', 'decisions'
      ),
      jsonb_build_object(
        'key', 'decision_visibility_1',
        'text', 'Do all stakeholders understand who made each decision and why?',
        'type', 'likert',
        'domain', 'decisions'
      ),
      jsonb_build_object(
        'key', 'decision_consistency_1',
        'text', 'How consistent is decision-making across similar situations?',
        'type', 'likert',
        'domain', 'decisions'
      ),

      -- ACCOUNTABILITY SIGNAL (6 questions)
      jsonb_build_object(
        'key', 'accountability_assignment_1',
        'text', 'For each major initiative, is there one clearly named accountable owner?',
        'type', 'likert',
        'domain', 'accountability'
      ),
      jsonb_build_object(
        'key', 'accountability_tracking_1',
        'text', 'How frequently are accountable owners checked in on their progress?',
        'type', 'radio',
        'domain', 'accountability',
        'options', array['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Ad-hoc/Unclear']
      ),
      jsonb_build_object(
        'key', 'accountability_consequences_1',
        'text', 'Are there clear consequences for missing committed targets?',
        'type', 'likert',
        'domain', 'accountability'
      ),
      jsonb_build_object(
        'key', 'accountability_clarity_1',
        'text', 'How clear are the boundaries of who owns what?',
        'type', 'likert',
        'domain', 'accountability'
      ),
      jsonb_build_object(
        'key', 'accountability_handoff_1',
        'text', 'When work transitions between teams, how clearly is ownership transferred?',
        'type', 'likert',
        'domain', 'accountability'
      ),
      jsonb_build_object(
        'key', 'accountability_visibility_1',
        'text', 'Can anyone in the organization quickly identify who owns a specific area?',
        'type', 'likert',
        'domain', 'accountability'
      ),

      -- ESCALATION SIGNAL (6 questions)
      jsonb_build_object(
        'key', 'escalation_path_1',
        'text', 'Is there a clear escalation path for blocked work?',
        'type', 'likert',
        'domain', 'escalation'
      ),
      jsonb_build_object(
        'key', 'escalation_speed_1',
        'text', 'How quickly are escalated issues resolved?',
        'type', 'radio',
        'domain', 'escalation',
        'options', array['Within 24 hours', 'Within 48 hours', 'Within a week', 'Within 2 weeks', '2+ weeks']
      ),
      jsonb_build_object(
        'key', 'escalation_authority_1',
        'text', 'When issues escalate, is there clear authority to make binding decisions?',
        'type', 'likert',
        'domain', 'escalation'
      ),
      jsonb_build_object(
        'key', 'escalation_frequency_1',
        'text', 'How often do issues get "stuck" at various levels?',
        'type', 'likert',
        'domain', 'escalation'
      ),
      jsonb_build_object(
        'key', 'escalation_communication_1',
        'text', 'When something escalates, do affected parties stay informed?',
        'type', 'likert',
        'domain', 'escalation'
      ),
      jsonb_build_object(
        'key', 'escalation_root_cause_1',
        'text', 'After escalations are resolved, is root cause addressed or just the symptom?',
        'type', 'likert',
        'domain', 'escalation'
      ),

      -- RESOURCE FLOW SIGNAL (6 questions)
      jsonb_build_object(
        'key', 'resource_request_1',
        'text', 'How long does it take from resource request to approval?',
        'type', 'radio',
        'domain', 'resource_flow',
        'options', array['Same day', '1-3 days', '3-7 days', '1-2 weeks', '2+ weeks']
      ),
      jsonb_build_object(
        'key', 'resource_clarity_1',
        'text', 'Are resource request criteria clear and consistent?',
        'type', 'likert',
        'domain', 'resource_flow'
      ),
      jsonb_build_object(
        'key', 'resource_deployment_1',
        'text', 'Once approved, how quickly are resources deployed?',
        'type', 'likert',
        'domain', 'resource_flow'
      ),
      jsonb_build_object(
        'key', 'resource_reallocation_1',
        'text', 'How easily can resources be reallocated if priorities change?',
        'type', 'likert',
        'domain', 'resource_flow'
      ),
      jsonb_build_object(
        'key', 'resource_conflict_1',
        'text', 'How often does resource conflict between teams create gridlock?',
        'type', 'likert',
        'domain', 'resource_flow'
      ),
      jsonb_build_object(
        'key', 'resource_visibility_1',
        'text', 'Can leadership see where all resources are allocated?',
        'type', 'likert',
        'domain', 'resource_flow'
      ),

      -- FEEDBACK SIGNAL (6 questions)
      jsonb_build_object(
        'key', 'feedback_surfacing_1',
        'text', 'Do team members feel safe surfacing problems without fear?',
        'type', 'likert',
        'domain', 'feedback'
      ),
      jsonb_build_object(
        'key', 'feedback_mechanism_1',
        'text', 'What is the primary mechanism for surfacing operational problems?',
        'type', 'radio',
        'domain', 'feedback',
        'options', array['Regular meetings', 'Informal conversation', 'Escalation process', 'Anonymous channel', 'No clear mechanism']
      ),
      jsonb_build_object(
        'key', 'feedback_response_1',
        'text', 'When problems are identified, how quickly are they addressed?',
        'type', 'radio',
        'domain', 'feedback',
        'options', array['Within 24 hours', 'Within a week', 'Within 2 weeks', 'Within a month', 'Unclear/Inconsistent']
      ),
      jsonb_build_object(
        'key', 'feedback_pattern_1',
        'text', 'Are recurring problems tracked to identify systemic issues?',
        'type', 'likert',
        'domain', 'feedback'
      ),
      jsonb_build_object(
        'key', 'feedback_learning_1',
        'text', 'Does the organization learn from past problems to prevent recurrence?',
        'type', 'likert',
        'domain', 'feedback'
      ),
      jsonb_build_object(
        'key', 'feedback_culture_1',
        'text', 'Is problem-surfacing viewed as positive contribution or criticism?',
        'type', 'likert',
        'domain', 'feedback'
      )
    )
  )
FROM demo_org;

-- Create a model version if it doesn't exist
INSERT INTO model_versions (
  org_id,
  name,
  version,
  version_number,
  description,
  model_data
)
SELECT
  demo_org.id,
  'Default ESI Model',
  '1.0.0',
  1,
  'Default execution systems index model with equal domain weighting',
  jsonb_build_object(
    'domains', jsonb_build_object(
      'decisions', 0.2,
      'accountability', 0.25,
      'escalation', 0.2,
      'resource_flow', 0.2,
      'feedback', 0.15
    )
  )
FROM demo_org
ON CONFLICT DO NOTHING;
