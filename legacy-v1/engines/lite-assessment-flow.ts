// lite-assessment-flow.ts
// Design for ESI Lite Assessment Flow

/*
FLOW LOGIC
==========

1. User initiates Lite assessment
   - Selects Lite version from available assessment_versions where type = 'lite'
   - Creates assessment record with assessment_version_id pointing to Lite version

2. Question Presentation
   - Fetch questions from assessment_version.schema_json (subset for Lite)
   - Present questions in order (same UI as Full, but fewer questions)

3. Response Collection
   - Store responses in same 'responses' table
   - No difference in storage schema

4. Email Collection (Pre-Results)
   - After submission, redirect to email capture form
   - Store email in temporary session or assessment metadata
   - Required before showing results

5. Scoring and Results
   - Use same scoring engine with provided responses
   - Calculate domain scores, composite, risk band
   - For Lite: Hide domain breakdowns, show only:
     - Risk band
     - Top 1 prescription (highest priority)
     - Teaser message: "Unlock full domain insights and detailed prescriptions with a complete assessment"

6. Access Control
   - Results endpoint checks if assessment is Lite type
   - Restricts visibility of detailed domain scores and multiple prescriptions
   - Full assessments show all data

DB FLAGS
========

- assessment_versions.type: 'lite' | 'full' (existing)
- No additional flags needed; derive Lite status from version.type
- Email storage: Add optional 'contact_email' field to assessments table for Lite flows

ACCESS CONTROL APPROACH
=======================

- Use existing RLS policies (scoped to org)
- Add application-level checks in API routes:
  - For /api/assessments/:id/results
    - If assessment.version.type === 'lite', filter response to show only:
      - risk_band
      - top_prescription (first from assessment_prescriptions, ordered by priority)
      - teaser_message
    - Hide domain_scores array, full prescription list
- Admin users bypass restrictions for debugging/support

API ROUTES NEEDED
=================

1. GET /api/assessments/lite/versions
   - Returns available Lite assessment_versions for user's org
   - Filters by type = 'lite' and org_id

2. POST /api/assessments/lite/start
   - Body: { assessment_version_id }
   - Creates assessment record
   - Returns assessment_id

3. GET /api/assessments/:id/questions
   - Returns questions from assessment_version.schema_json
   - Same route for Lite/Full, but Lite has fewer questions

4. POST /api/assessments/:id/responses
   - Body: { responses: Response[] }
   - Stores in responses table
   - Same route for Lite/Full

5. POST /api/assessments/:id/complete
   - Triggers scoring (same engine)
   - For Lite: Returns { requires_email: true, next_step: 'collect_email' }

6. POST /api/assessments/:id/email
   - Body: { email: string }
   - Stores email in assessment.contact_email
   - Returns success

7. GET /api/assessments/:id/results
   - Checks if Lite:
     - If yes: Return limited results + teaser
     - If no: Return full results
   - Includes audit info

EXAMPLE FLOW SEQUENCE
=====================

1. User visits /assess/lite
2. GET /api/assessments/lite/versions → Select version
3. POST /api/assessments/lite/start → Get assessment_id
4. GET /api/assessments/{id}/questions → Show 10 questions (vs 50 for Full)
5. User answers → POST /api/assessments/{id}/responses
6. POST /api/assessments/{id}/complete → { requires_email: true }
7. Show email form → POST /api/assessments/{id}/email
8. GET /api/assessments/{id}/results → Show limited results

SCHEMA CHANGES
==============

Add to assessments table:
- contact_email TEXT (nullable, for Lite email collection)

No other changes needed; leverages existing schema.
*/

// Example API route stubs (implement in pages/api/assessments/lite/...)

// GET /api/assessments/lite/versions
export async function getLiteVersions(orgId: string) {
  // Query assessment_versions where org_id = orgId AND type = 'lite'
  // Return list
}

// POST /api/assessments/lite/start
export async function startLiteAssessment(userId: string, assessmentVersionId: string) {
  // Validate version is Lite and accessible
  // Create assessment record
  // Return assessment_id
}

// GET /api/assessments/:id/results (modified for Lite)
export async function getAssessmentResults(assessmentId: string, userId: string) {
  // Fetch assessment with version
  // If version.type === 'lite':
  //   - Get risk_band, top prescription
  //   - Return limited response
  // Else:
  //   - Return full results
}