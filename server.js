const express = require("express");
const axios = require("axios");
const grossRevenueRoutes = require("./routes/grossRevenue");
const funnelSnapshotRoutes = require("./routes/funnelSnapshot");
const funnelSnapshotGhlRoutes = require("./routes/funnelSnapshotGhl");
const funnelSnapshotChargebeeRoutes = require("./routes/funnelSnapshotChargebee");
const clientBaseHealthRoutes = require("./routes/clientBaseHealth");
const alertsRoutes = require("./routes/alerts");
const effectiveLifetimeRoutes = require("./routes/effectiveLifetime");
const weeklySignupPaidConversionRoutes = require("./routes/weeklySignupPaidConversion");
const monthlyChurnRateRoutes = require("./routes/monthlyChurnRate");
const monthlyRetentionRoutes = require("./routes/monthlyRetention");
const cohortRetentionRoutes = require("./routes/cohortRetention");
const weeklyNetGrowthRoutes = require("./routes/weeklyNetGrowth");
const showRateBySourceRoutes = require("./routes/showRateBySource");
const formSubmissionsFunnelRoutes = require("./routes/formSubmissionsFunnel");
const cpcRoutes = require("./routes/cpc");
const calendarEventsRoutes = require("./routes/calendarEvents");

const app = express();

// CORS middleware
function addCorsHeaders(res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

app.use((req, res, next) => {
  addCorsHeaders(res);
  next();
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.status(200).send();
  } else {
    next();
  }
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Server is running 🚀" });
});

app.use("/api/gross-revenue", grossRevenueRoutes);
app.use("/api/cpc", cpcRoutes);
app.use("/api/funnel-snapshot", funnelSnapshotRoutes);
app.use("/api/funnel-snapshot-ghl", funnelSnapshotGhlRoutes);
app.use("/api/funnel-snapshot-chargebee", funnelSnapshotChargebeeRoutes);
app.use("/api/client-base-health", clientBaseHealthRoutes);
app.use("/api/alerts", alertsRoutes);
app.get("/onlytest", async (req, res) => {
  try {
    const webhookUrl =
      "https://hook.eu1.make.com/91jqb1524eh9kdlsyrari2g2pj0mfkg7";
    const response = await axios.get(webhookUrl);

    console.log("=== WEBHOOK RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("=== END WEBHOOK RESPONSE ===");

    // Dynamic sum calculation
    const data = response.data.result || [];
    const total = data.reduce((sum, item) => {
      const value = Object.values(item)[0];
      const numericValue = parseFloat(value.replace(/[$,]/g, ""));
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);

    console.log("=== CALCULATED SUM ===");
    console.log(`Total: $${total.toFixed(2)}`);
    console.log("=== END CALCULATED SUM ===");

    res.json({
      total: total,
      formattedTotal: `$${total.toFixed(2)}`,
      itemCount: data.length,
      rawData: response.data,
    });
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

//27 feb start

app.use("/api/effective-lifetime", effectiveLifetimeRoutes);
app.use("/api/weekly-signup-paid-conversion", weeklySignupPaidConversionRoutes);
app.use("/api/monthly-churn-rate", monthlyChurnRateRoutes);
app.use("/api/monthly-retention", monthlyRetentionRoutes);
app.use("/api/cohort-retention", cohortRetentionRoutes);
app.use("/api/weekly-net-growth", weeklyNetGrowthRoutes);
app.use("/api/show-rate-by-source", showRateBySourceRoutes);
app.use("/api/form-submissions-funnel", formSubmissionsFunnelRoutes);
app.use("/api/calendar-events", calendarEventsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
