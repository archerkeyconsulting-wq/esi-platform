-- score_assessment_transactional.sql
-- Supabase RPC function for transactional scoring

CREATE OR REPLACE FUNCTION score_assessment_transactional(
  p_assessment_id UUID,
  p_model_version_id UUID,
  p_composite_score NUMERIC,
  p_risk_band TEXT,
  p_confidence_index NUMERIC,
  p_domain_scores JSONB,
  p_prescriptions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id UUID;
  v_org_id UUID;
  v_domain RECORD;
  v_prescription RECORD;
BEGIN
  -- Get org_id from assessment
  SELECT org_id INTO v_org_id
  FROM assessments
  WHERE id = p_assessment_id;

  -- Lock assessment
  PERFORM * FROM assessments WHERE id = p_assessment_id FOR UPDATE;

  -- Set existing latest run to false
  UPDATE assessment_runs
  SET is_latest = false
  WHERE assessment_id = p_assessment_id
    AND is_latest = true
    AND deleted_at IS NULL;

  -- Insert new run
  INSERT INTO assessment_runs (
    org_id,
    assessment_id,
    model_version_id,
    composite_score,
    risk_band,
    confidence_index,
    is_latest
  )
  VALUES (
    v_org_id,
    p_assessment_id,
    p_model_version_id,
    p_composite_score,
    p_risk_band,
    p_confidence_index,
    true
  )
  RETURNING id INTO v_run_id;

  -- Insert domain scores
  FOR v_domain IN SELECT * FROM jsonb_object_keys(p_domain_scores) AS domain, jsonb_extract_path_text(p_domain_scores, jsonb_object_keys) AS score
  LOOP
    INSERT INTO domain_scores (
      assessment_id,
      model_version_id,
      assessment_run_id,
      domain,
      score
    )
    VALUES (
      p_assessment_id,
      p_model_version_id,
      v_run_id,
      v_domain.domain,
      v_domain.score::NUMERIC
    );
  END LOOP;

  -- Insert prescriptions (assuming p_prescriptions is array of {prescription_id, priority, ...})
  FOR v_prescription IN SELECT * FROM jsonb_array_elements(p_prescriptions)
  LOOP
    INSERT INTO assessment_prescriptions (
      assessment_id,
      prescription_id,
      assessment_run_id,
      generated_at
    )
    VALUES (
      p_assessment_id,
      (v_prescription->>'prescription_id')::UUID,
      v_run_id,
      NOW()
    );
  END LOOP;

  RETURN v_run_id;
END;
$$;