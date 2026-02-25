-- Updated dashboard query (no mixed versions, no MAX hacks)
-- Fetch latest completed assessments with latest run + run-tied domain scores + prescriptions.
-- Parameter: $1 = org_id

-- NOTE: This query assumes assessment_runs.is_latest is maintained by your scoring pipeline.
-- When creating a new run, set previous latest false, new one true (transactional).

SELECT
  a.id,
  a.period,
  a.status,
  a.completed_at,
  a.user_id,
  u.name AS user_name,
  av.title AS assessment_title,
  av.type AS assessment_type,

  ar.id AS assessment_run_id,
  ar.composite_score,
  ar.risk_band,
  ar.confidence_index,
  mv.version_number AS model_version_number,

  (
    SELECT json_agg(
      json_build_object('domain', ds.domain, 'score', ds.score)
      ORDER BY ds.domain
    )
    FROM domain_scores ds
    WHERE ds.assessment_run_id = ar.id
      AND ds.deleted_at IS NULL
  ) AS domain_scores,

  (
    SELECT json_agg(
      json_build_object('prescription_id', ap.prescription_id, 'title', pl.title, 'applied', ap.applied)
      ORDER BY pl.title
    )
    FROM assessment_prescriptions ap
    JOIN prescription_library pl ON pl.id = ap.prescription_id
    WHERE ap.assessment_run_id = ar.id
      AND ap.deleted_at IS NULL
  ) AS prescriptions

FROM assessments a
JOIN users u ON u.id = a.user_id
JOIN assessment_versions av ON av.id = a.assessment_version_id
JOIN assessment_runs ar ON ar.assessment_id = a.id AND ar.is_latest = true AND ar.deleted_at IS NULL
JOIN model_versions mv ON mv.id = ar.model_version_id

WHERE a.org_id = $1
  AND a.status = 'completed'
  AND a.deleted_at IS NULL

ORDER BY a.completed_at DESC
LIMIT 10;