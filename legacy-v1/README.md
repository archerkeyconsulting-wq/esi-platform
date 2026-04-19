# NARO - Execution Intelligence Platform

A proof-layer platform for Archer Key's Execution Diagnostic engagement that measures how execution breaks down inside operations and quantifies the financial impact.

## Overview

NARO MVP provides three core components:

1. **Digital Assessment Engine** - Consultant-led 30-question interview protocol to capture five execution signals
2. **Auto-Generated Operations Map** - Visual representation of execution workflows and bottleneck analysis
3. **Leadership Intelligence Dashboard** - 4-screen interface showing ESI score, signal breakdown, financial impact, and portfolio comparison

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js API routes, Supabase PostgreSQL
- **Authentication**: Supabase Auth (magic links)
- **Visualization**: Recharts, custom React components
- **Deployment**: Vercel + Supabase

## Project Structure

```
esi-platform/
├── app/                          # Next.js app directory
│   ├── (assessment)/             # Assessment flow routes
│   │   ├── new/                  # Start assessment
│   │   ├── [id]/                 # Assessment form
│   │   ├── [id]/results/         # Assessment results
│   │   └── [id]/operations-map/  # Operations map visualization
│   ├── (dashboard)/              # Dashboard routes (authenticated)
│   │   ├── page.tsx              # ESI Snapshot screen
│   │   ├── signals/              # Signal Breakdown screen
│   │   ├── waterfall/            # Financial Impact screen
│   │   └── portfolio/            # Portfolio Comparison (PE Sponsor only)
│   ├── auth/                     # Authentication routes
│   │   ├── login/                # Magic link login
│   │   └── callback/             # Auth callback handler
│   ├── api/                      # API routes
│   │   ├── assessments/          # Assessment management
│   │   └── dashboard/            # Dashboard data endpoints
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home landing page
│   ├── globals.css               # Global styles
│   └── middleware.ts             # Auth middleware (optional)
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── auth.ts                   # Auth utilities and RBAC
│   └── api-client.ts             # API client utilities
├── scoring-engine.ts             # Deterministic scoring algorithm
├── prescription-engine.ts        # Prescription selection logic
├── schema.sql                    # Database schema
└── seed-assessment-template.sql  # Assessment template seed data
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with PostgreSQL database
- Vercel account (for deployment)

### 1. Environment Setup

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Get these values from your Supabase project dashboard.

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Run the schema migration:
   - Copy entire contents of `schema.sql`
   - Paste into SQL Editor and execute

4. Create assessment template:
   - Copy entire contents of `seed-assessment-template.sql`
   - Paste into SQL Editor and execute

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Key Features

### Assessment Flow

1. **Start Assessment** → Select lite or full assessment
2. **Answer Questions** → 30-question form (one per screen)
3. **Save Responses** → Auto-save as you go
4. **Complete & Score** → Trigger scoring engine
5. **View Results** → ESI score, domain scores, risk band

### Dashboard

**Screen 1: ESI Snapshot**
- Large ESI score (0-100 scale)
- Risk band status indicator
- Trend arrow (up/flat/down over 90 days)
- Benchmark comparison
- One-line diagnosis of biggest gap
- CTAs to drill deeper or schedule follow-up

**Screen 2: Signal Breakdown**
- All 5 execution signals ranked by weakness
- Each signal: score, benchmark, gap, trend
- Color-coded status (green/yellow/red)
- Hoverable tooltips with definitions and peer examples
- Sortable by weakness, improvement potential, or name

**Screen 3: Execution Waterfall**
- Stacked bar chart showing financial impact per signal
- Total value at risk estimate
- Narrative: "This is what we can capture together"
- Each gap annotated with annual cost/savings

**Screen 4: Portfolio Comparison** (PE Sponsor only)
- Heatmap of all portfolio companies × signals
- Anonymized company names
- Color: Green (strong), Yellow (medium), Red (weak)
- Drill-down to individual company dashboards
- Peer learning insights

### Operations Map

- Visual representation of execution workflow (Decisions → Accountability → Execution → Outcome)
- Bottleneck analysis showing top 3 gaps
- Financial impact breakdown
- Recommended actions (30/60/90-day priorities)
- Exportable to PDF or shareable HTML

## API Endpoints

### Assessment Management

```
POST   /api/assessments/new                    # Create assessment
GET    /api/assessments/[id]/questions         # Fetch questions
POST   /api/assessments/[id]/responses         # Save response
POST   /api/assessments/[id]/complete          # Mark complete, trigger scoring
POST   /api/assessments/[id]/score             # Calculate score
GET    /api/assessments/[id]/results           # Fetch results
GET    /api/assessments/[id]/operations-map    # Get operations map data
GET    /api/assessments/[id]/operations-map/pdf # Export PDF
```

### Dashboard Data

```
GET    /api/dashboard/snapshot                 # ESI, trend, diagnosis
GET    /api/dashboard/signals                  # Signal scores and benchmarks
GET    /api/dashboard/waterfall                # Financial impact breakdown
GET    /api/dashboard/portfolio                # Portfolio comparison (PE Sponsor only)
```

### Authentication

```
POST   /api/auth/signin                        # Email magic link login
POST   /api/auth/signout                       # Logout
GET    /api/auth/me                            # Fetch current user
```

## Authentication & Authorization

### Roles

- **Admin** - Full access, can manage organizations and users
- **COO/Operator** - Access to their company's assessment and dashboard data
- **PE Sponsor** - Access to portfolio view with anonymized peer comparison
- **User** - Basic access (future role for non-COO users)

### Access Control

- Auth via Supabase magic links (email)
- Role-based data filtering at API level
- Organization-scoped queries (multi-tenant)
- Dashboard components conditionally render based on role

## Database Schema Highlights

- **organizations** - Portfolio companies
- **users** - Platform users
- **organization_memberships** - User-org relationship with roles
- **assessments** - Assessment instances
- **assessment_versions** - Assessment templates (lite/full)
- **responses** - Individual question responses
- **domain_scores** - Calculated scores per execution signal
- **risk_classifications** - Overall risk band per assessment
- **assessment_runs** - Anchors for scoring runs
- **prescription_library** - Recommended actions
- **assessment_prescriptions** - Prescriptions generated per assessment

## Scoring Algorithm

The Execution Systems Index (ESI) is calculated using a weighted model:

```
ESI = (Decisions × 0.2) + (Accountability × 0.25) + (Escalation × 0.2) + 
      (Resource_Flow × 0.2) + (Feedback × 0.15)
```

Each signal is:
- Scored 0-100 based on question responses
- Compared against peer benchmarks
- Mapped to financial impact estimates

Risk bands:
- **Stable** (70-100): Execution performing well
- **Emerging Strain** (50-69): Early warning signs
- **Structural Friction** (30-49): Significant gaps
- **Systemic Breakdown** (0-29): Critical issues

## Deployment

### Vercel Deployment

1. Push code to GitHub branch
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy:

```bash
vercel deploy --prod
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Assessment templates seeded
- [ ] Auth magic link domain whitelisted in Supabase
- [ ] CORS configured for API endpoints
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] Logging/monitoring set up

## Design System

### Colors

- **Primary Accent**: #FFDE59 (yellow)
- **Status Strong**: #10b981 (green) - score 70+
- **Status Medium**: #f59e0b (amber) - score 50-69
- **Status Weak**: #ef4444 (red) - score <50
- **Neutral**: Grays and whites

### Typography

- **Font Family**: Helvetica Neue (system stack fallback)
- **Hierarchy**: Large headings, secondary text, small labels

### Layout Principles

- One insight per screen
- Whitespace-heavy design
- Visual hierarchy guides the eye
- Metric as narrative (not just numbers)
- Benchmark as context

## Testing

### Manual Testing Checklist

- [ ] Can complete a full assessment
- [ ] All responses save correctly
- [ ] Scoring calculates accurate ESI and domain scores
- [ ] Dashboard displays all 4 screens correctly
- [ ] Operations map generates and displays properly
- [ ] PDF export works
- [ ] Role-based access control functions correctly
- [ ] Auth flow works (login, magic link, logout)
- [ ] Responsive design works on mobile/tablet
- [ ] All API endpoints return correct data
- [ ] Error handling displays appropriate messages
- [ ] Performance is acceptable (pages load <2s)

### Running Tests

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## Troubleshooting

### Common Issues

**"Missing Supabase credentials"**
- Ensure `.env.local` file exists with correct Supabase credentials
- Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

**"Assessment not found"**
- Verify assessment exists and user has access to the org
- Check Supabase dashboard for assessment record

**"Auth callback error"**
- Verify Supabase Auth domain is whitelisted
- Check that magic link redirect URL matches deployment domain

**"Scoring failed"**
- Ensure assessment_versions has schema_json with questions
- Check that all responses are properly formatted
- Verify model_versions exists for org

## Future Enhancements

Post-MVP:
- [ ] Advanced analytics and predictive execution risk
- [ ] Automated data capture from ERP/MES systems
- [ ] Real-time dashboard updates
- [ ] API for ERP integration
- [ ] Industry benchmarks (cross-portfolio, cross-industry)
- [ ] Mobile app
- [ ] Advanced drill-down and filtering
- [ ] Comparative analysis tools
- [ ] Execution trend forecasting
- [ ] Subscription product layer ($50K annual)

## Support

For issues or questions:
1. Check Supabase dashboard for errors
2. Review browser console for client-side errors
3. Check Vercel logs for deployment issues
4. Open an issue on the GitHub repository

## License

Internal use only - Archer Key Consulting.
