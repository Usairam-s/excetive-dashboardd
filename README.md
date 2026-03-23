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
- **Deployment:** Vercel (`vercel.json` routes all traffic to `server.js`)

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
  - Vercel config building `server.js` via `@vercel/node` and routing all requests to it.

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
  - Returns per-form rows and overall summary rates.

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
      - `totalBookedPersonal`
      - `totalBookedBusiness`
      - `totalShowedPersonal`
      - `totalShowedBusiness`
      - `totalMishapsPersonal`
      - `totalMishapsBusiness`
      - `overallShowRate`
      - `overallNoShowRate`
    - `formSubmissionsBySource`: array of per-form stats

---

## 7) Frontend Tabs and Data Wiring

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

## 8) External Integrations

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

## 9) Date/Timezone Behavior

Date logic is manually implemented in controllers and not centralized.

Important implementation detail:
- Several controllers treat **05:00 UTC as midnight in America/New_York**.
- Weekly periods are generally Monday-based.

Because logic is duplicated across files, date adjustments require coordinated updates in multiple controllers.

---

## 10) Core Metric Formulas

- **Net Revenue** = Gross Payments − Processing Fees − Allocated Salary
- **Revenue Per Client** = Total Net Revenue / Active Clients
- **Cost Per Client (CPC)** = Ad Spend / Customers Acquired (per date row)
- **Effective Lifetime (months)** = Active Clients / Avg Monthly Cancellations
- **Churn Rate (%)** = (Cancellations in last 30 days / Active clients at period start) × 100
- **Show Rate (%)** = (Showed / Booked) × 100
- **Funnel Close Rate (%)** = (Enrolled / Total Showed) × 100
- **90-Day Projection** uses ARPU + recent growth + retention trend (forecast metric, not strict accounting)

---

## 11) Local Development (Start to Finish)

### Prerequisites

- Node.js 18+ recommended
- npm

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

### Open frontend

Options:
- Open `index.html` directly in browser
- Or serve static file with any local static server

Make sure `API_BASE_URL` in `index.html` matches your backend URL.

### Quick checks

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/gross-revenue
curl http://localhost:3000/api/funnel-snapshot
curl http://localhost:3000/api/client-base-health
curl http://localhost:3000/api/alerts
curl http://localhost:3000/api/cpc
```

---

## 12) Deployment

Vercel is configured via `vercel.json`:
- build target: `server.js` with `@vercel/node`
- all routes forward to `server.js`

High-level deploy flow:
1. Push repo to Git provider
2. Import project in Vercel
3. Deploy
4. Point frontend `API_BASE_URL` to deployed domain if needed

---

## 13) Risks / Technical Debt

- Hardcoded production credentials/tokens in source (security risk)
- Repeated API and date logic across controllers
- No tests
- No schema validation
- No caching/rate-limiting
- Very large monolithic frontend file
- Duplicate form-submission frontend logic paths

---

## 14) Safe Change Guidelines

When editing this codebase:

1. Check both controller response shape and frontend usage in `index.html`.
2. Preserve existing field names unless updating backend + frontend together.
3. Treat timezone/date updates as cross-controller changes.
4. Be careful around form-submissions sections due to duplicate frontend paths.
5. Prefer additive changes for API compatibility.

---

## 15) Current Runtime Defaults

- Backend default port: `3000`
- Frontend API base in source: `http://localhost:3000`
- CORS: open to all origins in `server.js`

---

## 16) Maintainer Notes

- This repository prioritizes business visibility and fast KPI delivery.
- It is operationally useful but structurally monolithic.
- If refactoring later, safest order is:
  1. shared Chargebee helpers
  2. shared LeadConnector helpers
  3. centralized date utilities
  4. formal endpoint contracts
  5. frontend modularization
  6. move secrets to environment variables
