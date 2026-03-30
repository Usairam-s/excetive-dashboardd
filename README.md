# Executive Dashboard

Operational dashboard for executive reporting across revenue, funnel performance, client health, alerts, and show-rate analytics.

This project contains:
- A Node.js + Express API backend
- A single-page frontend in one `index.html`
- Integrations with Chargebee, LeadConnector/GoHighLevel, and a Make webhook

---

## 1) What This App Does

The dashboard surfaces core business KPIs in five primary areas:

1. Gross Revenue
2. Funnel Snapshot
3. Client Base Health
4. Alerts
5. Show Rate + Form Submissions Funnel

It calculates daily/weekly/monthly slices for many metrics, and also provides static risk/projection indicators.

---

## 2) Tech Stack

- **Runtime:** Node.js
- **Backend:** Express
- **HTTP client:** Axios
- **Frontend:** Vanilla HTML/CSS/JavaScript in one file (`index.html`)
- **Charts:** Chart.js
- **Deployment:** Vercel (static HTML + serverless Node API, configured in `vercel.json`)
- **Version Control:** Git + GitHub (private repo: `chargebee-project`)
- **Date:** 23 March 2026

---

## 3) Project Structure (Everything in Repo)

```text
excetive-dashboardd/
  .gitignore
  CLAUDE.md
  README.md
  index.html
  package.json
  package-lock.json
  server.js
  vercel.json
  controllers/
    alertsController.js
    clientBaseHealthController.js
    cohortRetentionController.js
    cpcController.js
    effectiveLifetimeController.js
    formSubmissionsFunnelController.js
    funnelSnapshotController.js
    grossRevenueController.js
    monthlyChurnRateController.js
    monthlyRetentionController.js
    showRateBySourceController.js
    weeklyNetGrowthController.js
    weeklySignupPaidConversionController.js
  routes/
    alerts.js
    clientBaseHealth.js
    cohortRetention.js
    cpc.js
    effectiveLifetime.js
    formSubmissionsFunnel.js
    funnelSnapshot.js
    grossRevenue.js
    monthlyChurnRate.js
    monthlyRetention.js
    showRateBySource.js
    weeklyNetGrowth.js
    weeklySignupPaidConversion.js
```

---

## 4) File-by-File Responsibilities

### Root files

- **`.gitignore`**
  - Ignores `.vercel`, `node_modules`, and several backup/history HTML folders/files.

- **`CLAUDE.md`**
  - Internal operations guide documenting architecture, metric intent, risks, and safe change rules.

- **`index.html`**
  - Entire frontend application:
    - all markup
    - all styles
    - all JS state and fetch logic
    - all chart rendering
    - tab routing and interactions

- **`package.json`**
  - Project metadata and runtime deps (`express`, `axios`), plus `npm start` script.

- **`package-lock.json`**
  - Dependency lockfile (npm lockfile v3), resolved package tree.

- **`server.js`**
  - Express bootstrap and middleware setup:
    - permissive CORS
    - `OPTIONS` handling
    - health route `/`
    - mounts all API routes
    - test route `/onlytest` (salary webhook + sum)

- **`vercel.json`**
  - Vercel config with dual builds:
    - Static HTML deployment via `@vercel/static`
    - Node.js API via `@vercel/node`
  - Route rules:
    - `/api/*` → `server.js` (serverless functions)
    - `/` → `index.html` (static file serving)
  - Enables full-stack deployment in single Vercel project

### Route files (`routes/`)

Each route file follows the same pattern:
- create Express router
- import one controller function
- expose `GET /` for that route namespace

Files:
- `alerts.js` → `getAlerts`
- `clientBaseHealth.js` → `getClientBaseHealth`
- `cohortRetention.js` → `getCohortRetention`
- `cpc.js` → `getCpc`
- `effectiveLifetime.js` → `getEffectiveLifetime`
- `formSubmissionsFunnel.js` → `getFormSubmissionsFunnel`
- `funnelSnapshot.js` → `getFunnelSnapshot`
- `grossRevenue.js` → `getGrossRevenue`
- `monthlyChurnRate.js` → `getMonthlyChurnRate`
- `monthlyRetention.js` → `getMonthlyRetention`
- `showRateBySource.js` → `getShowRateBySource`
- `weeklyNetGrowth.js` → `getWeeklyNetGrowth`
- `weeklySignupPaidConversion.js` → `getWeeklySignupPaidConversion`

### Controller files (`controllers/`)

- **`grossRevenueController.js`**
  - Pulls Chargebee transactions/subscriptions/differential prices + Make salary.
  - Computes daily/weekly/monthly:
    - new revenue
    - existing revenue
    - recovery revenue
    - total net revenue
    - salary allocation
    - processing fees
    - active clients
    - revenue per client

- **`funnelSnapshotController.js`**
  - Largest controller; combines LeadConnector + Chargebee.
  - Produces nested daily/weekly/monthly payload for:
    - leads
    - booked/showed (personal/business)
    - enrolled/paid counts and revenue
    - mishaps (count + amount personal/business)
    - pre-billing cancellations
    - revenue at risk
    - derived funnel metrics (show rate, close rate, no-show cost, paid conversion)

- **`clientBaseHealthController.js`**
  - Returns:
    - active clients (daily/weekly/monthly/total)
    - net client growth (daily/weekly/monthly)
    - last-month retention rate
    - 90-day projection

- **`alertsController.js`**
  - Builds alert signals using fixed thresholds:
    - show rate below threshold
    - no-show loss above threshold
    - WoW revenue decline
    - WoW ARPU decline
  - Returns alert list, summary, and metric blocks used by banner cards.

- **`effectiveLifetimeController.js`**
  - Computes effective lifetime (months) from active clients and last 90-day cancellation trend.

- **`weeklySignupPaidConversionController.js`**
  - Looks at signups from last 7 days and checks first payment timing.
  - Outputs 7-day and 14-day conversion rates.

- **`monthlyChurnRateController.js`**
  - Calculates last-30-days churn from cancellations over active-at-start cohort.

- **`monthlyRetentionController.js`**
  - Computes simplified month-2 and month-3 retention cohorts (60–90 and 90–120 day windows).

- **`cohortRetentionController.js`**
  - Builds table for last 6 complete signup months with M1..M6 retention plus current active percent.

- **`weeklyNetGrowthController.js`**
  - Calculates new/lost/net customers across last 5 complete weeks.

- **`showRateBySourceController.js`**
  - Groups booked/showed/mishaps by attribution medium and includes separate manual-booking row.

- **`cpcController.js`**
  - Fetches ad spend data from a Make.com webhook backed by a Google Sheets source.
  - Each row in the sheet contains: date, money spent (daily or weekly), customers acquired by that spend.
  - Webhook returns all rows as a JSON array (via Make Array Aggregator — see section 8).
  - Column mapping from webhook: `"0"` = date, `"1"` = spend, `"2"` = customers.
  - Computes `costPerClient = spend / customers` per date row (0 if customers = 0).
  - Deduplicates by date and sorts by `__IMTINDEX__` bundle order.
  - Returns:
    - `rows`: array of `{ date, spend, customers, costPerClient }`
    - `summary`: `{ totalSpend, totalCustomers, averageCostPerClient }`
  - Example live output (23 March 2026):
    ```json
    {
      "rows": [
        { "date": "17th March", "spend": 156.75, "customers": 58, "costPerClient": 2.70 },
        { "date": "18th March", "spend": 139.46, "customers": 52, "costPerClient": 2.68 },
        { "date": "19th March", "spend": 120.03, "customers": 39, "costPerClient": 3.08 },
        { "date": "20th March", "spend": 149.33, "customers": 34, "costPerClient": 4.39 }
      ],
      "summary": { "totalSpend": 565.57, "totalCustomers": 183, "averageCostPerClient": 3.09 }
    }
    ```

- **`formSubmissionsFunnelController.js`**
  - Connects selected forms + submissions to booking/show/mishap outcomes.
  - **Data Fix Logic:** 
    - Automatically counts contacts that showed but weren't booked as booked (corrects tagging gaps).
    - Applies mishap overrides to booked/showed contacts correctly.
  - **Contact Status Mapping:** Uses a Map-based approach to handle duplicate entries and status precedence.
  - **Per-Form Stats:** Calculates for each target form:
    - submission count, booked (personal/business), showed (personal/business)
    - mishaps (personal/business)
    - show rate (showed ÷ booked), no-show rate (mishaps ÷ booked)
  - **Overall Summary:** Aggregates totals across all forms and calculates overall show/no-show rates.
  - **Response:** JSON with `summary` (totals + rates) and `formSubmissionsBySource` (per-form breakdown).

---

## 5) Backend Startup and Request Flow

1. `server.js` initializes Express.
2. Adds permissive CORS headers for all requests.
3. Handles `OPTIONS` preflight.
4. Mounts route modules under `/api/...`.
5. Route delegates to controller.
6. Controller fetches external APIs, computes metrics, returns JSON.
7. Frontend fetches these JSON endpoints and updates cards/tables/charts.

---

## 6) API Endpoints (Complete)

Base: `http://localhost:3000` (local) or deployed domain.

### Health

- `GET /`
  - Returns server status message.

- `GET /onlytest`
  - Calls salary webhook and returns parsed total + raw payload.

### Dashboard APIs

- `GET /api/gross-revenue`
  - Response:
    - `daily`, `weekly`, `monthly`
    - each has:
      - `newRevenue`
      - `existingRevenue`
      - `recoveryRevenue`
      - `totalNetRevenue`
      - `totalProcessingFees`
      - `totalSalary`
      - `activeClients`
      - `revenuePerClient`
      - `period`, `startDate`, `endDate`

- `GET /api/effective-lifetime`
  - Response: `effectiveLifetime` with
    - `months`
    - `activeClients`
    - `last90DaysCancellations`
    - `avgMonthlyCancellations`

- `GET /api/funnel-snapshot`
  - Response keys:
    - `leads`
    - `booked`
    - `showed`
    - `mishaps`
    - `preBillingCancellations`
    - `revenueAtRisk`
    - `enrolled`
    - `paid`
    - `metrics`
  - Most sections are nested by `daily/weekly/monthly` with personal/business splits where applicable.

- `GET /api/weekly-signup-paid-conversion`
  - Response: `signupToPaidConversion`
    - `totalEnrolled`
    - `paidWithin7Days`
    - `paidWithin14Days`
    - `conversion7DayRate`
    - `conversion14DayRate`

- `GET /api/client-base-health`
  - Response:
    - `activeClients` (`daily`, `weekly`, `monthly`, `total`)
    - `netClientGrowth` (`daily`, `weekly`, `monthly`)
    - `retentionRate`
    - `ninetyDayProjection`

- `GET /api/monthly-churn-rate`
  - Response: `monthlyChurnRate`
    - `churnRate`
    - `activeClientsAtStart`
    - `cancellationsLast30Days`

- `GET /api/monthly-retention`
  - Response: `monthlyRetention`
    - `month2` (`retentionRate`, `enrolled`, `stillActive`)
    - `month3` (`retentionRate`, `enrolled`, `stillActive`)

- `GET /api/cohort-retention`
  - Response: `{ cohorts: [...] }`
  - Each cohort row includes:
    - `signupMonth`, `totalSignups`
    - `m1`..`m6`
    - `activePercent`

- `GET /api/weekly-net-growth`
  - Response:
    - `weeks`: array of `{ week, newCustomers, lostCustomers, netGrowth }`
    - `summary`: `{ totalGrowth, avgGrowth }`

- `GET /api/alerts`
  - Response:
    - `alerts` (array)
    - `timestamp`
    - `summary` (`totalAlerts`, `highSeverity`)
    - `metrics`:
      - `showRate`
      - `arpu`
      - `revenue`
      - `noshowLoss`

- `GET /api/show-rate-by-source`
  - Response:
    - `manualBooking`
    - `showRateBySource` (array by medium)
    - `summary` (`totalBooked`, `totalShowed`, `totalMishaps`, `overallShowRate`)

- `GET /api/cpc`
  - Response:
    - `rows`: array of objects per date:
      - `date` (string, e.g. `"17th March"`)
      - `spend` (number — daily or weekly ad spend)
      - `customers` (integer — customers acquired by that spend)
      - `costPerClient` (number — spend ÷ customers, rounded to 2 dp)
    - `summary`:
      - `totalSpend`
      - `totalCustomers`
      - `averageCostPerClient`

- `GET /api/form-submissions-funnel`
  - Response:
    - `summary`:
      - `totalSubmissions`
      - `totalBookedPersonal` / `totalBookedBusiness`
      - `totalShowedPersonal` / `totalShowedBusiness`
      - `totalMishapsPersonal` / `totalMishapsBusiness`
      - `overallShowRate` (%)
      - `overallNoShowRate` (%)
    - `formSubmissionsBySource`: array of per-form objects:
      - `formName`
      - `submissions` (count)
      - `bookedPersonal`, `bookedBusiness`, `showedPersonal`, `showedBusiness`
      - `mishapsPersonal`, `mishapsBusiness`
      - `showRate` (%)
      - `noShowRate` (%)

---

## 7) Environment Configuration & API Base URL

### Auto-Detection (Frontend)

The frontend (`index.html`) automatically detects the API base URL:

```javascript
const API_BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "";
```

**Behavior:**
- **Local development:** `http://localhost:3000` (Node backend on port 3000)
- **Vercel production:** `` (empty string — uses same domain as frontend)

This eliminates manual URL updates when moving between local and production.

### Deployment Environments

**Local Development:**
- Backend: `http://localhost:3000` (npm start)
- Frontend: `http://localhost:8000` (python3 -m http.server 8000)
- API calls: `http://localhost:3000/api/*`

**Vercel Production:**
- Frontend & Backend: `https://excetive-dashboardd.vercel.app`
- API calls: `/api/*` (relative, same domain)

---

## 8) Frontend Tabs and Data Wiring

`index.html` has tabbed UI sections:

- **Gross Revenue tab**
  - Uses `/api/gross-revenue` + `/api/effective-lifetime`
  - Renders cards and bar chart

- **Funnel Snapshot tab**
  - Uses `/api/funnel-snapshot` + `/api/weekly-signup-paid-conversion`
  - Has two independent period selectors (`timeOnlyPeriod`, `appointmentPeriod`)
  - Renders funnel flow chart and personal/business doughnut charts

- **Client Base Health tab**
  - Uses `/api/client-base-health`
  - Then fetches `/api/monthly-churn-rate`, `/api/monthly-retention`, `/api/cohort-retention`, `/api/weekly-net-growth`

- **Show Rate tab**
  - Uses `/api/show-rate-by-source`
  - Also loads `/api/form-submissions-funnel` section beneath
  - Also loads `/api/cpc` section at the bottom

- **Alerts row**
  - Loaded immediately on page load from `/api/alerts`

- **CPC (Cost Per Client) section** — within Show Rate tab
  - Uses `/api/cpc`
  - 3 summary cards: Total Spend, Total Customers Acquired, Avg Cost Per Client
  - Table: Date | Spend ($) | Customers Acquired | Cost Per Client ($)
  - Data loads automatically when Show Rate tab is opened
  - Cached in `cpcData` global variable; cleared on tab refresh

Notes:
- API base URL in current file is set to localhost, with deployed URL commented.
- Form submissions logic has duplicate functions in frontend script (legacy + current paths).

---

## 9) External Integrations

### Chargebee

Used for:
- subscriptions
- transactions
- differential prices

Common patterns in controllers:
- paginated list requests via `next_offset`
- status/time filters (`active`, `in_trial`, `cancelled`, etc.)

### LeadConnector / GoHighLevel

Used for:
- contact search by tags/date ranges
- contact details
- custom fields metadata
- forms
- form submissions

Tag-based status model is heavily used (booked/showed/no-show/cancelled/invalid/manual).

### Make webhook

Used for two purposes:

1. **Salary** — pulls weekly salary/cost figures and converts formatted currency strings into numeric totals (used by `grossRevenueController.js` and `alertsController.js`).

2. **CPC (Cost Per Client)** — pulls Google Sheets ad spend rows via a dedicated Make scenario. Used by `cpcController.js`.

   **Required Make scenario structure:**
   ```
   Webhook (instant) → Google Sheets (Get Rows) → Array Aggregator → Webhook Response
   ```

   **Array Aggregator settings:**
   - Source Module: the Google Sheets module
   - No "Group by" field (leave empty — outputs one single array)
   - The aggregator collects all row bundles into one array before the response fires

   **Webhook Response settings:**
   - Body: output of the Array Aggregator (the full array)
   - Header: `Content-Type: application/json`
   - Status: `200`

   > **Important:** Without the Array Aggregator, Make sends one HTTP response per row. Only the first row is received by the server. The Array Aggregator is mandatory to return all rows in a single response.

   The webhook returns column indices as keys: `"0"` = date, `"1"` = spend, `"2"` = customers.

---

## 10) Date/Timezone Behavior

Date logic is manually implemented in controllers and not centralized.

Important implementation detail:
- Several controllers treat **05:00 UTC as midnight in America/New_York**.
- Weekly periods are generally Monday-based.

Because logic is duplicated across files, date adjustments require coordinated updates in multiple controllers.

---

## 11) Core Metric Formulas

- **Net Revenue** = Gross Payments − Processing Fees − Allocated Salary
- **Revenue Per Client** = Total Net Revenue / Active Clients
- **Cost Per Client (CPC)** = Ad Spend / Customers Acquired (per date row)
- **Effective Lifetime (months)** = Active Clients / Avg Monthly Cancellations
- **Churn Rate (%)** = (Cancellations in last 30 days / Active clients at period start) × 100
- **Show Rate (%)** = (Showed / Booked) × 100
- **Funnel Close Rate (%)** = (Enrolled / Total Showed) × 100
- **90-Day Projection** uses ARPU + recent growth + retention trend (forecast metric, not strict accounting)

---

## 12) Local Development (Start to Finish)

### Prerequisites

- Node.js 18+ recommended
- npm
- Python 3 (for serving static frontend locally)

### Install

```bash
npm install
```

### Run API server

```bash
npm start
```

Server starts on:
- `http://localhost:3000` (or `PORT` env override)

### Serve Frontend Locally

In a separate terminal, serve the static `index.html` file:

```bash
python3 -m http.server 8000
```

Frontend loads at:
- `http://localhost:8000/index.html`

API calls auto-detect to `http://localhost:3000` (see section 7).

### Quick Verification

```bash
# Backend health check
curl http://localhost:3000/

# Sample API endpoints
curl http://localhost:3000/api/gross-revenue
curl http://localhost:3000/api/funnel-snapshot
curl http://localhost:3000/api/client-base-health
curl http://localhost:3000/api/alerts
curl http://localhost:3000/api/cpc

# Frontend health check
curl http://localhost:8000/index.html | head -20
```

---

## 13) Deployment to Vercel

### Overview

The project is currently deployed to Vercel with live URL:
- **Production:** `https://excetive-dashboardd.vercel.app`
- **Status:** ✅ Live (as of 23 March 2026)

### Vercel Configuration

`vercel.json` configures both static and API deployment:

```json
{
  "version": 2,
  "builds": [
    { "src": "server.js", "use": "@vercel/node" },
    { "src": "index.html", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server.js" },
    { "src": "/", "dest": "index.html" }
  ]
}
```

This allows:
- API routes (`/api/*`) to run as Node.js serverless functions
- Static `index.html` to serve as-is
- Automatic fallback to frontend for client-side routing

### Deploy from Local

Option A: Direct Vercel CLI
```bash
vercel --prod --yes
```

Option B: Push to GitHub, configure Git Integration
```bash
git push chargebee-project main
# Vercel auto-deploys on push (if Git Integration configured)
```

### Post-Deployment

- frontend automatically detects Vercel domain and sets `API_BASE_URL = ""`
- API calls use relative paths: `/api/endpoint-name`
- No manual environment variable configuration needed

---

## 14) Git & GitHub Repository

### Repository Structure

Two remotes are configured:

1. **origin** (Usairam-s account)
   - GitHub repo: https://github.com/Usairam-s/... (untouched)
   - Status: Backup/historical

2. **chargebee-project** (Shahzeb-Khn account)
   - GitHub repo: https://github.com/Shahzeb-Khn/chargebee-project
   - Visibility: Private
   - Status: Active development repo (pushed 23 March 2026)
   - All code backed up here

### Git Workflow

```bash
# View configured remotes
git remote -v

# Push to chargebee-project (Shahzeb-Khn account)
git add -A
git commit -m "Update feature/fix description"
git push chargebee-project main

# Check remote status
git status
```

### Git Integration with Vercel (Optional)

For automatic deployments on Git push, configure Vercel → GitHub integration:
1. Go to Vercel project dashboard
2. Settings → Git Integration
3. Select `chargebee-project` repo on GitHub
4. Enable auto-deploy on main branch push
5. Future: `git push chargebee-project main` automatically deploys

---

## 15) Risks / Technical Debt

- Hardcoded production credentials/tokens in source (security risk)
- Repeated API and date logic across controllers
- No tests
- No schema validation
- No caching/rate-limiting
- Very large monolithic frontend file
- Duplicate form-submission frontend logic paths

---

## 16) Safe Change Guidelines

When editing this codebase:

1. Check both controller response shape and frontend usage in `index.html`.
2. Preserve existing field names unless updating backend + frontend together.
3. Treat timezone/date updates as cross-controller changes.
4. Be careful around form-submissions sections due to duplicate frontend paths.
5. Prefer additive changes for API compatibility.

---

## 17) Current Runtime Defaults

- Backend default port: `3000`
- Frontend API base in source: `http://localhost:3000`
- CORS: open to all origins in `server.js`

---

## 18) Maintainer Notes & Future Work

### Current State (30 March 2026)

- **Form Submissions Funnel Feature:** ✅ Enhanced with data fix logic
  - Automatically counts showed-but-not-booked contacts as booked (corrects tagging gaps)
  - Per-form statistics with show/no-show rate calculations
  - Overall summary with aggregated metrics across all forms
  - Data integrity improvements

- **CPC (Cost Per Client) Feature:** ✅ Fully implemented, tested, deployed
  - Backend: `/api/cpc` endpoint
  - Frontend: Show Rate tab with summary cards + data table
  - Make webhook: Array Aggregator pattern for multi-row support
  - Live data: updates as new rows are added

- **Deployment:** ✅ Live on Vercel
  - Static + API configuration working
  - Auto-detecting API base URL
  - All tabs rendering correctly

- **Git Backup:** ✅ All code pushed to private `chargebee-project` repo

### Next Steps (Optional)

1. **Set up GitHub → Vercel Git Integration** for auto-deploy on push
2. **Move secrets to environment variables** (currently hardcoded in controllers)
3. **Refactor date/timezone logic** (currently duplicated across controllers)
4. **Modularize frontend** (`index.html` is large: 1500+ lines)
5. **Add tests** (currently none)
6. **Add schema validation** for API responses

### Architecture Notes

- This repository prioritizes business visibility and fast KPI delivery.
- It is operationally useful but structurally monolithic.
- If refactoring later, safest order is:
  1. shared Chargebee helpers
  2. shared LeadConnector helpers
  3. centralized date utilities
  4. formal endpoint contracts
  5. frontend modularization
  6. move secrets to environment variables

---

## 19) Quick Reference

### Live URLs

| Environment | URL |
|---|---|
| Production | https://excetive-dashboardd.vercel.app |
| Local API | http://localhost:3000 |
| Local Frontend | http://localhost:8000/index.html |

### Key Files

| File | Purpose |
|---|---|
| `server.js` | Express bootstrap + route mounting |
| `index.html` | Entire frontend app |
| `vercel.json` | Vercel static + API config |
| `controllers/cpcController.js` | Cost Per Client metric |
| `CLAUDE.md` | Internal operations & architecture notes |

### Commands

```bash
# Local dev (two terminals)
# Terminal 1: Backend
npm start

# Terminal 2: Frontend
python3 -m http.server 8000

# Deploy to Vercel
vercel --prod --yes

# Push to GitHub
git push chargebee-project main
```

### Debugging

```bash
# Check if ports are free
lsof -i :3000
lsof -i :8000

# Test API endpoint
curl http://localhost:3000/api/cpc

# Test frontend
curl http://localhost:8000/index.html | head -20
```
