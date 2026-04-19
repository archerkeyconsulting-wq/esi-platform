-- ESI Platform Supabase Postgres Schema
-- Multi-tenant SaaS platform for Execution Systems Index

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    global_role TEXT NOT NULL DEFAULT 'user' CHECK (global_role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Organization memberships
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(org_id, user_id)
);

-- Assessment versions (versioned assessment templates/forms per organization)
CREATE TABLE assessment_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lite', 'full')), -- Lite vs Full assessments
    title TEXT NOT NULL,
    description TEXT,
    schema_json JSONB NOT NULL, -- JSON schema for questions/responses
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(org_id, version, type)
);

-- Assessments (instances of assessments taken)
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
    period TEXT NOT NULL, -- e.g., 'Q1-2023' for quarterly reassessments
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    contact_email TEXT, -- For Lite assessments: email collected before results
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Responses (immutable raw responses per question)
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    question_key TEXT NOT NULL, -- Unique key for the question within the assessment version
    answer JSONB NOT NULL, -- Flexible answer storage (text, number, array, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(assessment_id, question_key) -- Prevent duplicate responses per question
);

-- Model versions (versioned scoring models per organization)
CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1, -- Explicit sortable version field
    description TEXT,
    model_data JSONB NOT NULL, -- Model configuration/parameters
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(org_id, name, version)
);

-- Domain scores (derived scores per domain)
CREATE TABLE domain_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    assessment_run_id UUID REFERENCES assessment_runs(id) ON DELETE RESTRICT, -- Ties to specific run
    domain TEXT NOT NULL,
    score NUMERIC NOT NULL,
    confidence NUMERIC, -- Optional confidence score
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(assessment_id, model_version_id, domain) -- Allow re-runs with different models
);

-- Risk classifications (derived risk levels)
CREATE TABLE risk_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    assessment_run_id UUID REFERENCES assessment_runs(id) ON DELETE RESTRICT, -- Ties to specific run
    classification TEXT NOT NULL,
    severity_score NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(assessment_id, model_version_id) -- One classification per assessment per model version
);

-- Prescription library (versioned prescriptions per organization)
CREATE TABLE prescription_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    measurable_outcome TEXT NOT NULL,
    implementation_notes TEXT, -- Optional detailed implementation guidance
    domain TEXT NOT NULL, -- e.g., 'leadership', 'strategy', 'operations', 'culture'
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'at_risk', 'watch')),
    track TEXT NOT NULL CHECK (track IN ('stabilization', 'correction', 'optimization', 'reinforcement')),
    time_horizon INTEGER NOT NULL CHECK (time_horizon IN (30, 60, 90)),
    sequence_order INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[], -- For categorization/filtering
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(org_id, version, title)
);

-- Assessment prescriptions (prescriptions generated for assessments)
CREATE TABLE assessment_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    prescription_id UUID NOT NULL REFERENCES prescription_library(id) ON DELETE RESTRICT,
    assessment_run_id UUID REFERENCES assessment_runs(id) ON DELETE RESTRICT, -- Ties to specific run
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(assessment_id, prescription_id) -- Prevent duplicate prescriptions per assessment
);

-- Outcomes (longitudinal outcome tracking)
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    outcome_type TEXT NOT NULL,
    value JSONB NOT NULL, -- Flexible outcome data
    measured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_organization_memberships_org_id ON organization_memberships(org_id);
CREATE INDEX idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_organization_memberships_deleted_at ON organization_memberships(deleted_at);
CREATE INDEX idx_assessment_versions_org_id ON assessment_versions(org_id);
CREATE INDEX idx_assessment_versions_deleted_at ON assessment_versions(deleted_at);
CREATE INDEX idx_assessments_org_id ON assessments(org_id);
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_assessment_version_id ON assessments(assessment_version_id);
CREATE INDEX idx_assessments_period ON assessments(period);
CREATE INDEX idx_assessments_deleted_at ON assessments(deleted_at);
CREATE INDEX idx_responses_assessment_id ON responses(assessment_id);
CREATE INDEX idx_responses_deleted_at ON responses(deleted_at);
CREATE INDEX idx_model_versions_org_id ON model_versions(org_id);
CREATE INDEX idx_model_versions_deleted_at ON model_versions(deleted_at);
CREATE INDEX idx_model_versions_version_number ON model_versions(version_number);

-- Assessment runs (anchors for scoring runs to prevent mixed versions and enable re-runs)
CREATE TABLE assessment_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    composite_score NUMERIC(5,2) NOT NULL,
    risk_band TEXT NOT NULL CHECK (risk_band IN ('stable', 'emerging_strain', 'structural_friction', 'systemic_breakdown')),
    confidence_index NUMERIC(4,3) NOT NULL CHECK (confidence_index >= 0 AND confidence_index <= 1),
    is_latest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_assessment_runs_org_id ON assessment_runs(org_id);
CREATE INDEX idx_assessment_runs_assessment_id ON assessment_runs(assessment_id);
CREATE INDEX idx_assessment_runs_is_latest ON assessment_runs(assessment_id, is_latest) WHERE deleted_at IS NULL;

-- Unique index to ensure only one latest run per assessment
CREATE UNIQUE INDEX uniq_latest_run_per_assessment
ON assessment_runs(assessment_id)
WHERE is_latest = true AND deleted_at IS NULL;
CREATE INDEX idx_domain_scores_assessment_id ON domain_scores(assessment_id);
CREATE INDEX idx_domain_scores_model_version_id ON domain_scores(model_version_id);
CREATE INDEX idx_domain_scores_run ON domain_scores(assessment_run_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_domain_scores_deleted_at ON domain_scores(deleted_at);
CREATE INDEX idx_risk_classifications_assessment_id ON risk_classifications(assessment_id);
CREATE INDEX idx_risk_classifications_model_version_id ON risk_classifications(model_version_id);
CREATE INDEX idx_risk_classifications_run ON risk_classifications(assessment_run_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_classifications_deleted_at ON risk_classifications(deleted_at);
CREATE INDEX idx_prescription_library_org_id ON prescription_library(org_id);
CREATE INDEX idx_prescription_library_matching ON prescription_library(org_id, domain, severity, track, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescription_library_deleted_at ON prescription_library(deleted_at);
CREATE INDEX idx_assessment_prescriptions_assessment_id ON assessment_prescriptions(assessment_id);
CREATE INDEX idx_assessment_prescriptions_prescription_id ON assessment_prescriptions(prescription_id);
CREATE INDEX idx_assessment_prescriptions_run ON assessment_prescriptions(assessment_run_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_prescriptions_deleted_at ON assessment_prescriptions(deleted_at);
CREATE INDEX idx_outcomes_assessment_id ON outcomes(assessment_id);
CREATE INDEX idx_outcomes_measured_at ON outcomes(measured_at);
CREATE INDEX idx_outcomes_deleted_at ON outcomes(deleted_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_memberships_updated_at BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_versions_updated_at BEFORE UPDATE ON assessment_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_versions_updated_at BEFORE UPDATE ON model_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_domain_scores_updated_at BEFORE UPDATE ON domain_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_classifications_updated_at BEFORE UPDATE ON risk_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescription_library_updated_at BEFORE UPDATE ON prescription_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_prescriptions_updated_at BEFORE UPDATE ON assessment_prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outcomes_updated_at BEFORE UPDATE ON outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Setup
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_runs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_orgs(user_uuid UUID)
RETURNS TABLE(org_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT om.org_id
    FROM organization_memberships om
    WHERE om.user_id = user_uuid
      AND om.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = user_uuid
          AND u.global_role = 'admin'
          AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
-- Organizations: Users can see organizations they belong to, admins see all
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (
        id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY organizations_insert ON organizations
    FOR INSERT WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY organizations_update ON organizations
    FOR UPDATE USING (
        id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY organizations_delete ON organizations
    FOR DELETE USING (is_user_admin(auth.uid()));

-- Users: Users can see themselves and users in their orgs, admins see all
CREATE POLICY users_select ON users
    FOR SELECT USING (
        id = auth.uid() OR
        id IN (
            SELECT om.user_id
            FROM organization_memberships om
            WHERE om.org_id IN (SELECT get_user_orgs(auth.uid()))
              AND om.deleted_at IS NULL
        ) OR
        is_user_admin(auth.uid())
    );

CREATE POLICY users_insert ON users
    FOR INSERT WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY users_update ON users
    FOR UPDATE USING (
        id = auth.uid() OR is_user_admin(auth.uid())
    );

CREATE POLICY users_delete ON users
    FOR DELETE USING (is_user_admin(auth.uid()));

-- Organization memberships: Users can see memberships in their orgs, admins see all
CREATE POLICY organization_memberships_select ON organization_memberships
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY organization_memberships_insert ON organization_memberships
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY organization_memberships_update ON organization_memberships
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY organization_memberships_delete ON organization_memberships
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

-- Assessment versions: Scoped to org
CREATE POLICY assessment_versions_select ON assessment_versions
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_versions_insert ON assessment_versions
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_versions_update ON assessment_versions
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_versions_delete ON assessment_versions
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

-- Assessments: Scoped to org
CREATE POLICY assessments_select ON assessments
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessments_insert ON assessments
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessments_update ON assessments
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessments_delete ON assessments
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

-- Responses: Scoped via assessment
CREATE POLICY responses_select ON responses
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY responses_insert ON responses
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY responses_update ON responses
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY responses_delete ON responses
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

-- Model versions: Scoped to org
CREATE POLICY model_versions_select ON model_versions
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY model_versions_insert ON model_versions
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY model_versions_update ON model_versions
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY model_versions_delete ON model_versions
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

-- Domain scores: Scoped via assessment
CREATE POLICY domain_scores_select ON domain_scores
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY domain_scores_insert ON domain_scores
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY domain_scores_update ON domain_scores
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY domain_scores_delete ON domain_scores
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

-- Risk classifications: Scoped via assessment
CREATE POLICY risk_classifications_select ON risk_classifications
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY risk_classifications_insert ON risk_classifications
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY risk_classifications_update ON risk_classifications
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY risk_classifications_delete ON risk_classifications
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

-- Prescription library: Scoped to org
CREATE POLICY prescription_library_select ON prescription_library
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY prescription_library_insert ON prescription_library
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY prescription_library_update ON prescription_library
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY prescription_library_delete ON prescription_library
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

-- Assessment prescriptions: Scoped via assessment
CREATE POLICY assessment_prescriptions_select ON assessment_prescriptions
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY assessment_prescriptions_insert ON assessment_prescriptions
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY assessment_prescriptions_update ON assessment_prescriptions
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY assessment_prescriptions_delete ON assessment_prescriptions
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

-- Outcomes: Scoped via assessment
CREATE POLICY outcomes_select ON outcomes
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY outcomes_insert ON outcomes
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY outcomes_update ON outcomes
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

CREATE POLICY outcomes_delete ON outcomes
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id
            FROM assessments a
            WHERE a.org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
        )
    );

-- Assessment runs: Scoped to org
CREATE POLICY assessment_runs_select ON assessment_runs
    FOR SELECT USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_runs_insert ON assessment_runs
    FOR INSERT WITH CHECK (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_runs_update ON assessment_runs
    FOR UPDATE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );

CREATE POLICY assessment_runs_delete ON assessment_runs
    FOR DELETE USING (
        org_id IN (SELECT get_user_orgs(auth.uid())) OR is_user_admin(auth.uid())
    );