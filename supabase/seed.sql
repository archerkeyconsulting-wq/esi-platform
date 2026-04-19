-- NARO v2 — demo seed
-- Idempotent: running twice will not duplicate rows.
-- Requires 0001_init.sql applied first.

-- Demo firm
insert into firms (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Archer Ridge Capital', 'archer-ridge-capital')
on conflict (id) do nothing;

-- Demo companies
insert into companies (id, firm_id, name, slug, industry, hold_start_date) values
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000001',
   'Trident Components Group',
   'trident-components',
   'Custom Fabrication',
   '2021-01-15'),
  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000001',
   'Vector Precision Manufacturing',
   'vector-precision',
   'Precision Manufacturing',
   '2022-06-01'),
  ('00000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000001',
   'Atlas Industrial Systems',
   'atlas-industrial',
   'Industrial Services',
   '2023-03-20')
on conflict (id) do nothing;

-- Trident — 72 Elevated (diagnostic-sourced)
insert into assessments (id, company_id, risk_score, status, source_type) values
  ('00000000-0000-0000-0000-000000001001',
   '00000000-0000-0000-0000-000000000101',
   72, 'elevated', 'diagnostic')
on conflict (id) do nothing;

insert into signals (id, assessment_id, signal_type, category, severity, contribution, evidence, raw_value) values
  ('00000000-0000-0000-0000-000000002001',
   '00000000-0000-0000-0000-000000001001',
   'supplier_concentration', 'operational_stability', 'moderate', 10,
   'Top supplier accounts for 64% of critical component supply. 2 qualified alternative suppliers identified.', '64%'),
  ('00000000-0000-0000-0000-000000002002',
   '00000000-0000-0000-0000-000000001001',
   'demand_fulfillment', 'operational_stability', 'moderate', 10,
   'Order backlog increased 31% over prior 90 days. OTIF declined from 94% to 82%.', '+31% backlog'),
  ('00000000-0000-0000-0000-000000002003',
   '00000000-0000-0000-0000-000000001001',
   'quality_drift', 'operational_stability', 'none', 0,
   'No quality drift signal detected. Scrap and defect rates within normal range.', null),
  ('00000000-0000-0000-0000-000000002004',
   '00000000-0000-0000-0000-000000001001',
   'erp_instability', 'systems_reliability', 'moderate', 10,
   'ERP migration active. Order processing errors up 22%. Manual overrides increased 35%.', '+22% errors'),
  ('00000000-0000-0000-0000-000000002005',
   '00000000-0000-0000-0000-000000001001',
   'throughput_variance', 'systems_reliability', 'mild', 5,
   'Cycle time increased 17% from baseline. Line utilization variance within acceptable range.', '+17% cycle time'),
  ('00000000-0000-0000-0000-000000002006',
   '00000000-0000-0000-0000-000000001001',
   'knowledge_attrition', 'organizational_capacity', 'mild', 5,
   'Tenured workforce (10+ years) at 17%. One key process owner identified as retirement-eligible within 18 months.', '17% tenured'),
  ('00000000-0000-0000-0000-000000002007',
   '00000000-0000-0000-0000-000000001001',
   'execution_load', 'organizational_capacity', 'mild', 5,
   '19 active initiatives. 28% running behind schedule. Leadership span: 9 direct reports.', '19 initiatives')
on conflict (id) do nothing;

-- Vector — 44 Moderate (csv-sourced)
insert into assessments (id, company_id, risk_score, status, source_type) values
  ('00000000-0000-0000-0000-000000001002',
   '00000000-0000-0000-0000-000000000102',
   44, 'moderate', 'csv')
on conflict (id) do nothing;

insert into signals (id, assessment_id, signal_type, category, severity, contribution, evidence, raw_value) values
  ('00000000-0000-0000-0000-000000002101',
   '00000000-0000-0000-0000-000000001002',
   'supplier_concentration', 'operational_stability', 'mild', 5,
   'Primary supplier at 52% of input materials. Three qualified alternatives on file.', '52%'),
  ('00000000-0000-0000-0000-000000002102',
   '00000000-0000-0000-0000-000000001002',
   'demand_fulfillment', 'operational_stability', 'none', 0,
   'Order fulfillment within baseline parameters. OTIF at 91%.', null),
  ('00000000-0000-0000-0000-000000002103',
   '00000000-0000-0000-0000-000000001002',
   'quality_drift', 'operational_stability', 'mild', 5,
   'Scrap rate increased 9% from prior quarter. Within acceptable variance range.', '+9%'),
  ('00000000-0000-0000-0000-000000002104',
   '00000000-0000-0000-0000-000000001002',
   'erp_instability', 'systems_reliability', 'none', 0,
   'No active system migrations. Systems stable.', null),
  ('00000000-0000-0000-0000-000000002105',
   '00000000-0000-0000-0000-000000001002',
   'throughput_variance', 'systems_reliability', 'moderate', 10,
   'Throughput variance at 18% from baseline. Cycle time up 22% on Line 3.', '+18% variance'),
  ('00000000-0000-0000-0000-000000002106',
   '00000000-0000-0000-0000-000000001002',
   'knowledge_attrition', 'organizational_capacity', 'moderate', 10,
   'Tenured workforce at 13%. Two supervisors with tenure under 2 years. Key tooling knowledge concentrated in one operator.', '13% tenured'),
  ('00000000-0000-0000-0000-000000002107',
   '00000000-0000-0000-0000-000000001002',
   'execution_load', 'organizational_capacity', 'mild', 5,
   '14 active initiatives. 22% delayed. Manageable load.', '14 initiatives')
on conflict (id) do nothing;

-- Atlas — 28 Healthy (csv-sourced)
insert into assessments (id, company_id, risk_score, status, source_type) values
  ('00000000-0000-0000-0000-000000001003',
   '00000000-0000-0000-0000-000000000103',
   28, 'healthy', 'csv')
on conflict (id) do nothing;

insert into signals (id, assessment_id, signal_type, category, severity, contribution, evidence, raw_value) values
  ('00000000-0000-0000-0000-000000002201',
   '00000000-0000-0000-0000-000000001003',
   'supplier_concentration', 'operational_stability', 'mild', 5,
   'Top supplier at 48% of inputs. Diversification effort ongoing.', '48%'),
  ('00000000-0000-0000-0000-000000002202',
   '00000000-0000-0000-0000-000000001003',
   'demand_fulfillment', 'operational_stability', 'none', 0,
   'Fulfillment strong. OTIF at 96%.', null),
  ('00000000-0000-0000-0000-000000002203',
   '00000000-0000-0000-0000-000000001003',
   'quality_drift', 'operational_stability', 'none', 0,
   'Quality metrics stable across all lines.', null),
  ('00000000-0000-0000-0000-000000002204',
   '00000000-0000-0000-0000-000000001003',
   'erp_instability', 'systems_reliability', 'none', 0,
   'Systems stable. No migrations in progress.', null),
  ('00000000-0000-0000-0000-000000002205',
   '00000000-0000-0000-0000-000000001003',
   'throughput_variance', 'systems_reliability', 'mild', 5,
   'Minor throughput variance on seasonal line. Within acceptable range.', '+8%'),
  ('00000000-0000-0000-0000-000000002206',
   '00000000-0000-0000-0000-000000001003',
   'knowledge_attrition', 'organizational_capacity', 'mild', 5,
   'Tenured workforce at 22%. Succession documentation in progress for two roles.', '22% tenured'),
  ('00000000-0000-0000-0000-000000002207',
   '00000000-0000-0000-0000-000000001003',
   'execution_load', 'organizational_capacity', 'none', 0,
   '8 active initiatives. All on schedule.', null)
on conflict (id) do nothing;
