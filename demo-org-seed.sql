-- demo-org-seed.sql
-- Create demo organization for ESI platform

INSERT INTO organizations (
    id,
    name,
    is_demo,
    created_at,
    updated_at
)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'ESI Demo Company',
    true,
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;