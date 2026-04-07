# CLAUDE.md

## Executive Dashboard Project Guide

This document is the starting point for any agent working on this repository. It explains the project structure, purpose, data flow, file-by-file responsibilities, external integrations, current behavior, known risks, and safe working rules.

---

## 1. Project Summary

This repository is a lightweight executive dashboard application for business reporting.

It has:

- a **Node.js + Express backend**
- a **single-page frontend in one large `index.html` file**
- integrations with:
  - **Chargebee** for billing/subscription data
  - **LeadConnector / GoHighLevel (GHL)** for CRM/contact/funnel data
  - **Make.com webhook** for salary data

The dashboard presents several business views:

1. **Gross Revenue**
2. **Funnel Snapshot**
3. **Client Base Health**
4. **Show Rate**
5. **Form Submissions Funnel** section inside the show-rate area

The app is deployed on **Vercel** and the frontend currently points to:

- `https://excetive-dashboardd.vercel.app` (public production URL)
- Local dev: `http://localhost:3000` (when running npm start locally)

**[Updated 8 April 2026]** Added local frontend serving via Express in server.js. Frontend now auto-detects localhost vs production and adjusts API_BASE_URL accordingly.

---

## 2. High-Level Architecture

### Frontend
- Entire UI is in `index.html`
- Uses:
  - plain HTML
  - inline CSS
  - inline JavaScript
  - Chart.js for charts
- No framework (no React/Vue/etc.)
- No build step

### Backend
- `server.js` boots Express
- Route files under `routes/`
- Business logic under `controllers/`

### External Data Sources
- **Chargebee**
  - subscriptions
  - transactions
  - differential prices
- **LeadConnector / GHL**
  - contacts search
  - forms
  - form submissions
  - contact custom fields
- **Make.com**
  - salary webhook

---

## 3. Runtime Model

### Request flow
Frontend → Express route → controller → external APIs → JSON response → frontend renders cards/tables/charts

### Deployment model
- `vercel.json` routes all requests to `server.js`
- Express serves API only
- frontend is a static file in repo, not served by Express in a structured multi-page way

---

## 4. Important Notes for Agents

## 4.1 Sensitive credentials are hardcoded
This repo currently contains hardcoded:
- Chargebee API key
- LeadConnector tokens
- location IDs
- webhook URLs

Agents should treat these as production secrets and **not duplicate them unnecessarily**.

If refactoring:
- prefer moving them to environment variables
- preserve behavior unless explicitly asked to secure/refactor

## 4.2 Timezone handling is custom and inconsistent
A lot of logic assumes:
- **America/New_York**
- implemented manually by using **5 AM UTC = midnight NY**
- **EXCEPTION: New leads queries use 4:15 AM UTC (EDT) as midnight**

This appears in multiple controllers and is duplicated.

Any date/time change must be made carefully.

**[Updated 8 April 2026]** New leads in funnelSnapshotGhlController now use 4:15 AM UTC instead of 5:00 AM UTC to align with EDT timezone. All other appointment-based queries (booked, showed) remain at 5:00 AM UTC.

## 4.3 No shared service layer
Controllers repeat:
- Chargebee fetching
- pagination
- auth setup
- GHL contact searches
- date range logic

This means:
- duplication is high
- bugs may exist in one controller but not another
- refactors should centralize only if requested

## 4.4 Frontend is monolithic
`index.html` is the whole frontend:
- styles
- markup
- state
- fetch calls
- rendering
- chart setup
- tab logic

Small changes can have wide impact.

---

## 5. Repository Structure

```text
excetive-dashboardd/
  .gitignore
  [index.html](http://_vscodecontentref_/0)
  [package.json](http://_vscodecontentref_/1)
  [server.js](http://_vscodecontentref_/2)
  [vercel.json](http://_vscodecontentref_/3)
  controllers/
    [alertsController.js](http://_vscodecontentref_/4)
    [clientBaseHealthController.js](http://_vscodecontentref_/5)
    [cohortRetentionController.js](http://_vscodecontentref_/6)
    [effectiveLifetimeController.js](http://_vscodecontentref_/7)
    [formSubmissionsFunnelController.js](http://_vscodecontentref_/8)
    [funnelSnapshotController.js](http://_vscodecontentref_/9)
    [grossRevenueController.js](http://_vscodecontentref_/10)
    [monthlyChurnRateController.js](http://_vscodecontentref_/11)
    [monthlyRetentionController.js](http://_vscodecontentref_/12)
    [showRateBySourceController.js](http://_vscodecontentref_/13)
    [weeklyNetGrowthController.js](http://_vscodecontentref_/14)
    [weeklySignupPaidConversionController.js](http://_vscodecontentref_/15)
  routes/
    [alerts.js](http://_vscodecontentref_/16)
    [clientBaseHealth.js](http://_vscodecontentref_/17)
    [cohortRetention.js](http://_vscodecontentref_/18)
    [effectiveLifetime.js](http://_vscodecontentref_/19)
    [formSubmissionsFunnel.js](http://_vscodecontentref_/20)
    [funnelSnapshot.js](http://_vscodecontentref_/21)
    [grossRevenue.js](http://_vscodecontentref_/22)
    [monthlyChurnRate.js](http://_vscodecontentref_/23)
    [monthlyRetention.js](http://_vscodecontentref_/24)
    [showRateBySource.js](http://_vscodecontentref_/25)
    [weeklyNetGrowth.js](http://_vscodecontentref_/26)
    [weeklySignupPaidConversion.js](http://_vscodecontentref_/27)

5. Important operating assumptions
Secrets are hardcoded
This repository currently contains hardcoded production credentials and webhook URLs.

That includes:

Chargebee API key
LeadConnector tokens
LeadConnector location ID
Make.com webhook URL
Do not casually duplicate or rotate these in code unless explicitly asked.

Timezone logic is manual
Most date logic assumes America/New_York but implements it manually by treating:

5 AM UTC = midnight New York
This pattern is repeated across controllers and is not centralized.

Frontend is monolithic
index.html is large and tightly coupled. Small response-shape changes can break multiple UI sections.

Controllers duplicate logic
Several controllers repeat:

Chargebee pagination
LeadConnector search logic
date range logic
plan lookup
salary handling
Any fix may need to be applied in more than one controller.

6. Root files
6.1 package.json
Purpose:

project metadata
start command
dependency list
Current notes:

package name does not reflect the actual dashboard name
only runtime dependencies exist
no dev tools or testing tools
Dependencies:

express
axios
Script:

start → node server.js
6.2 server.js
Purpose:

initializes Express
adds permissive CORS headers
handles OPTIONS
defines root health route
mounts all dashboard APIs
exposes a temporary test endpoint
Key behavior:

GET / returns a simple status JSON
GET /onlytest calls the Make webhook and sums returned currency-like values
mounts all route modules under /api/...
Notes:

CORS is fully open
no auth
no request validation
no rate limiting
no middleware abstraction
6.3 vercel.json
Purpose:

deploys server.js as a Vercel Node function
routes all requests to the Express app
Implication:

all backend traffic resolves through server.js
6.4 .gitignore
Contains:

.vercel
backup/
.index.html
13feb/
node_modules/
.forms-viewer.html
.show-rate-test.html
This suggests some manual backup/history workflow.

7. Frontend: index.html
This file is the entire frontend.

It contains:

all page markup
all styling
all state management
all API fetch logic
all dashboard render logic
tab switching
chart setup
loading states
External libraries used
Font Awesome
Lottie
Chart.js
Main tabs
Gross Revenue
Funnel Snapshot
Client Base Health
Show Rate
Frontend global state
The frontend stores API data in global variables such as:

grossRevenueData
funnelSnapshotData
clientBaseHealthData
alertsData
effectiveLifetimeData
weeklyConversionData
monthlyChurnData
monthlyRetentionData
cohortRetentionData
weeklyNetGrowthData
showRateData
formSubmissionsData
It also tracks:

currentTab
currentPeriod
timeOnlyPeriod
appointmentPeriod
Frontend API base URL
Currently hardcoded to production:

https://excetive-dashboard.vercel.app
A localhost version is commented out.

Initial load behavior
On page load:

alerts load immediately
gross revenue loads immediately
Other tabs load when visited.

Refresh behavior
Each tab has a refresh button that clears cached data and refetches.

Charts
Gross revenue bar chart
Funnel flow horizontal bar chart
Personal appointment doughnut chart
Business appointment doughnut chart
Important frontend quirks
The file is very large and tightly coupled.
There is duplicate or outdated form submissions logic.
There are two different render paths for form-submissions-related data.
Some UI text has typos and legacy wording.
API response contracts are assumed very strictly.
8. API endpoints
Main API list
/api/gross-revenue
/api/funnel-snapshot
/api/client-base-health
/api/alerts
/api/effective-lifetime
/api/weekly-signup-paid-conversion
/api/monthly-churn-rate
/api/monthly-retention
/api/cohort-retention
/api/weekly-net-growth
/api/show-rate-by-source
/api/form-submissions-funnel
9. Route files
Each route file is minimal.

Pattern:

import Express
import one controller function
router.get("/")
export router
There is no custom route-level business logic.

10. Controllers overview
10.1 Gross Revenue Controller
File:

controllers/grossRevenueController.js
Purpose:

calculate daily, weekly, monthly revenue metrics
Data sources:

Chargebee transactions
Chargebee subscriptions
Chargebee differential prices
Make salary webhook
Outputs:

new revenue
existing revenue
recovery revenue
total net revenue
total processing fees
salary allocation
active clients
revenue per client
Business rules:

new revenue = payments within first 30 days from first payment
existing revenue = payments after 30 days
recovery revenue = payment after a gap of more than 60 days
net revenue subtracts processing fees and salary
revenue per client uses active client count
Key implementation details:

Chargebee transactions are paginated
customer payment histories are reconstructed
plan IDs are derived from subscription items
processing fees come from differential prices
Risk areas:

historical completeness depends on fetching enough pages
time windows are hand-built
salary allocation is capped to 7 days
10.2 Funnel Snapshot Controller (GHL split)
Files:

controllers/funnelSnapshotGhlController.js (NEW - 8 April 2026)
controllers/funnelSnapshotChargebeeController.js (NEW - 8 April 2026)
controllers/funnelSnapshotController.js (legacy version, still present)

Purpose:

provide the main funnel view data split by data source
Separated into GHL and Chargebee dedicated controllers for clarity

GHL Controller (funnelSnapshotGhlController.js) tracks:

leads (with EDT timezone 4:15 AM UTC for new leads queries)
booked appointments personal/business (5:00 AM UTC)
showed appointments personal/business (5:00 AM UTC)
Both filtered (custom date ranges) and legacy (daily/weekly/monthly) modes

Chargebee Controller (funnelSnapshotChargebeeController.js) tracks:

enrolled (trial subscriptions)
paid (active subscriptions)
pre-billing cancellations
Frontend expects nested data by:

period
category
personal/business split (in GHL data)
This controller drives:

Time-based metrics area (combined from both sources)
Revenue-at-risk area
Appointment funnel area
Close rate calculation (now GHL-only: Showed ÷ Booked)

Recent Changes (8 April 2026):

Added getBookedFiltered() and getBookedLegacy() functions to funnelSnapshotGhlController
Booked data now returned in GHL API response as custom.booked.{personal, business} (filtered) and booked.{personal, business}.{daily, weekly, monthly} (legacy)
Close rate formula changed from Chargebee-based (Enrolled ÷ Total Showed) to GHL-only (Showed ÷ Booked)
New leads queries use EDT timezone (4:15 AM UTC) instead of 5:00 AM UTC
All other appointment queries remain at 5:00 AM UTC

Risk areas:

high complexity
many external calls
duplicated date logic across filtered and legacy paths
response contract is large and easy to break
10.3 Client Base Health Controller
File:

controllers/clientBaseHealthController.js
Purpose:

compute health metrics for the customer base
Main outputs:

active clients
net client growth
retention rate
90-day revenue projection
Internal sections:

getNetClientGrowth()
getActiveClients()
getRetentionRate()
get90DayProjection()
Important note:
The meaning of “active clients” is not consistent everywhere.

For filtered counts:

daily/weekly/monthly values are based on activation ranges, not simply “current snapshot active clients”
Retention logic:

reconstruct active-at-start and active-at-end of last month
Projection logic:

uses ARPU, recent growth, and retention trend
should be treated as a business estimate, not strict accounting output
Risk areas:

label ambiguity
repeated Chargebee fetch logic
broad assumptions in projection math
10.4 Alerts Controller
File:

controllers/alertsController.js
Purpose:

calculate alert-state metrics shown at the top of the dashboard
Alerts:

low show rate
high no-show loss
week-over-week net revenue decline
week-over-week ARPU decline
Thresholds:

show rate < 55%
no-show loss > $1000
revenue decline = any decline
ARPU decline > 10%
Special behavior:

fetches LeadConnector custom field definitions
identifies custom field IDs for no-show amounts
then fetches contact details individually to sum personal/business amounts
Response includes:

alerts
summary
metrics.showRate
metrics.arpu
metrics.revenue
metrics.noshowLoss
Risk areas:

expensive contact detail fan-out
heavy debug logging
duplicated revenue logic similar to gross revenue controller
10.5 Effective Lifetime Controller
File:

controllers/effectiveLifetimeController.js
Purpose:

compute effective lifetime in months
Formula:

active clients ÷ average monthly cancellations over last 90 days
Returns:

effective lifetime months
active clients
last 90 days cancellations
average monthly cancellations
Frontend behavior:

if no cancellations, frontend displays infinity
This metric is independent of daily/weekly/monthly filter buttons.

10.6 Weekly Signup Paid Conversion Controller
File:

controllers/weeklySignupPaidConversionController.js
Purpose:

calculate how many recent signups convert to paid within 7 and 14 days
Logic:

recent signups = subscriptions created in last 7 days
for each signup, find first payment date from transactions
count conversion within 7 days and 14 days
Outputs:

total enrolled
paid within 7 days
paid within 14 days
7-day conversion rate
14-day conversion rate
10.7 Monthly Churn Rate Controller
File:

controllers/monthlyChurnRateController.js
Purpose:

calculate churn for the last 30 days
Logic:

identify customers active at period start
identify cancellations during last 30 days
compute churn percentage
Outputs:

churn rate
active clients at start
cancellations last 30 days
10.8 Monthly Retention Controller
File:

controllers/monthlyRetentionController.js
Purpose:

calculate simplified month 2 and month 3 retention
Logic:

month 2 cohort = enrolled 60–90 days ago
month 3 cohort = enrolled 90–120 days ago
compare cohort size to how many are currently active
Outputs:

month 2 retention block
month 3 retention block
This is a simplified retention measure, not a strict historical month-end reconstruction.

10.9 Cohort Retention Controller
File:

controllers/cohortRetentionController.js
Purpose:

produce a retention table for the last 6 complete signup months
For each cohort:

collect signups in that month
compute M1–M6 retention checkpoints
compute current active percentage
Output:

array of cohort objects with month-by-month retention values
Used by the client-base-health retention table.

10.10 Weekly Net Growth Controller
File:

controllers/weeklyNetGrowthController.js
Purpose:

show new vs lost customers for last 5 complete weeks
For each week:

fetch trial subscriptions created that week
fetch active subscriptions activated that week
fetch cancelled subscriptions cancelled that week
compute:
new customers
lost customers
net growth
Returns:

list of week rows
summary total growth
summary average growth
10.11 Show Rate By Source Controller
File:

controllers/showRateBySourceController.js
Purpose:

compute show rate by traffic/source medium
Inputs:

booked personal/business contacts
showed personal/business contacts
mishap contacts
manually scheduled contacts
Logic:

dedupe by contact ID
build manual booking row
group regular contacts by attributionSource.medium
compute booked/showed/mishaps/show rate per source
Returns:

manualBooking
showRateBySource
summary
Used by:

show rate summary cards
show rate table
10.12 Form Submissions Funnel Controller
File:

controllers/formSubmissionsFunnelController.js
Purpose:

connect form submissions to booking/show/mishap outcomes
Sources:

GHL forms
GHL form submissions
GHL contacts by appointment-status tags
Target forms:

Qualifying Questions/Get Credit Reports
Form to gather lead info before booking
Logic:

fetch all relevant contact groups
fetch all forms
fetch all submissions
filter to the two target forms
map contact IDs to booking/show/mishap outcome categories
compute stats per form
compute overall totals and rates
Returns summary fields like:

total submissions
booked personal/business
showed personal/business
mishaps personal/business
overall show rate
overall no-show rate
Important warning:
There is old or mismatched frontend code that expects a different shape for some form submission UI. The visible section under show rate appears to match the current backend better than the extra tab-like form-submission code.

11. External integrations
11.1 Chargebee
Used for:

subscriptions
transactions
differential prices
Common patterns:

HTTP basic auth
paginated list responses
next_offset
Important subscription statuses:

active
in_trial
cancelled
Important fields:

customer_id
created_at
activated_at
cancelled_at
subscription_items
11.2 LeadConnector / GoHighLevel
Used for:

contacts search
contact details
custom fields metadata
forms list
form submissions
Common pattern:

bearer auth
API version header
Important tags:

new lead
confirmed_appointment_status_personal
confirmed_appointment_status_business
showed_appointment_status_personal
showed_appointment_status_business
no_show_appointment_status_personal
no_show_appointment_status_business
cancelled_appointment_status_personal
cancelled_appointment_status_business
invalid_appointment_status_personal
invalid_appointment_status_business
manually_scheduled
Important custom fields:

contact.no_show_amount_personal
contact.no_show_amount_business
11.3 Make.com
Used for:

weekly salary/cost input
Behavior:

webhook returns values as formatted currency-like strings
backend strips $ and commas and sums them
12. Time and date behavior
This project does not use a centralized timezone utility.

Most controllers manually compute:

daily range
weekly range
monthly range
Typical assumption:

05:00 UTC represents New York midnight
Week logic usually:

week starts Monday
This logic is duplicated and should be treated carefully.

If changing date behavior:

inspect every controller, not just one
13. Key formulas
Net revenue
Net Revenue
=
Gross Payments
−
Processing Fees
−
Allocated Salary
Net Revenue=Gross Payments−Processing Fees−Allocated Salary
Revenue per client
Revenue Per Client
=
Total Net Revenue
Active Clients
Revenue Per Client= 
Active Clients
Total Net Revenue
​
 
Effective lifetime
Effective Lifetime
=
Active Clients
Average Monthly Cancellations
Effective Lifetime= 
Average Monthly Cancellations
Active Clients
​
 
Churn rate
Churn Rate
=
Cancellations in Last 30 Days
Active Clients at Start of Period
×
100
Churn Rate= 
Active Clients at Start of Period
Cancellations in Last 30 Days
​
 ×100
Show rate
Show Rate
=
Showed
Booked
×
100
Show Rate= 
Booked
Showed
​
 ×100
Close rate in funnel UI
Close Rate
=
Showed
Booked
×
100
Close Rate= 
Booked
Showed
​
 ×100

**[Updated 8 April 2026]** Changed from Chargebee-based (Enrolled ÷ Total Showed) to GHL-only (Showed ÷ Booked). Both numerator and denominator now come from GHL contacts tagged with showed_appointment_status_* and confirmed_appointment_status_* tags.
90-day projection
The code approximates future revenue using:

current active clients
ARPU
recent growth
retention trend
Treat this as a planning metric, not a strict finance metric.

14. Known risks and debt
hardcoded production secrets
duplicated logic across controllers
no service abstraction
no test coverage
no schema validation
no caching
many network calls per request (6 API calls per funnel snapshot load)
monolithic frontend
manual timezone math (now with EDT offset for leads)
possible old/dead UI code around form submissions

**[8 April 2026 Updates]**
- funnelSnapshotController.js split into funnelSnapshotGhlController.js and funnelSnapshotChargebeeController.js for clearer separation of concerns
- Close rate metric now GHL-only, eliminating Chargebee dependency for this calculation
- EDT timezone (4:15 AM UTC) introduced for new leads queries only
15. Safe-change rules for agents
Before changing anything:

inspect the backend controller
inspect the frontend code that consumes that endpoint
verify the exact response shape used in DOM rendering
preserve field names unless explicitly refactoring both sides
check whether similar logic exists in another controller
be cautious with date logic
be cautious with form submissions UI because duplicate logic exists
Do
make additive API changes when possible
keep response contracts stable
preserve current business meaning unless asked otherwise
verify all tabs affected by a metric
Do not
rename response fields casually
assume one metric definition is reused consistently everywhere
change date boundaries in only one controller
remove duplicate-looking code without checking actual usage
16. Suggested refactor order if asked later
If the user requests cleanup, safest order is:

extract shared Chargebee fetch helpers
extract shared LeadConnector helpers
centralize date-range utilities
document endpoint response contracts
split frontend script into modules
move credentials to environment variables
add caching and error normalization
remove old/duplicate form-submission UI code
17. Quick endpoint-to-UI mapping
Gross Revenue tab

/api/gross-revenue
/api/effective-lifetime
Funnel Snapshot tab

/api/funnel-snapshot-ghl (NEW - 8 April 2026)
/api/funnel-snapshot-chargebee (NEW - 8 April 2026)
/api/funnel-snapshot (legacy, kept for backward compatibility)
/api/weekly-signup-paid-conversion
Client Base Health tab

/api/client-base-health
/api/monthly-churn-rate
/api/monthly-retention
/api/cohort-retention
/api/weekly-net-growth
Alerts row

/api/alerts
Show Rate tab

/api/show-rate-by-source
/api/form-submissions-funnel
18. Local run notes
Install:

npm install
Start:

npm start
Default port:

3000
Production frontend currently points to the Vercel URL, not localhost, unless manually changed in the frontend script.

19. Final mental model
This is a business KPI dashboard built for fast reporting, not for clean architecture.

The project prioritizes:

business visibility
direct API integration
quick metric delivery
It does not yet prioritize:

maintainability
security
reuse
testability
performance optimization
When working in this repo, preserve behavior first. Refactor only when asked, and always confirm how the frontend consumes each controller response.
    