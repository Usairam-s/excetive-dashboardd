const axios = require("axios");

const CPC_WEBHOOK_URL =
  "https://hook.eu1.make.com/71qt6plmnyn8ko7po1mhx53yk75182w4";

// Safely parse a numeric value from a string or number (strips $, commas, spaces)
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

async function getCpc(req, res) {
  try {
    const response = await axios.get(CPC_WEBHOOK_URL);

    // Webhook returns one bundle per row; bundles may come as a single object
    // or as an array. Each bundle uses numeric column indices: "0"=date, "1"=spend, "2"=customers.
    // __IMTINDEX__ is the 1-based bundle position, __IMTLENGTH__ is total bundles.
    let bundles = [];
    if (Array.isArray(response.data)) {
      bundles = response.data;
    } else if (Array.isArray(response.data.result)) {
      bundles = response.data.result;
    } else if (response.data && typeof response.data === "object") {
      bundles = [response.data];
    }

    // Sort by bundle index so rows come out in spreadsheet order
    bundles.sort((a, b) => {
      const posA = parseNumber(a["__IMTINDEX__"]) || 0;
      const posB = parseNumber(b["__IMTINDEX__"]) || 0;
      return posA - posB;
    });

    // Deduplicate by date — last bundle for a given date wins (handles reruns)
    const dateMap = new Map();
    for (const bundle of bundles) {
      // Column "0" = Date, "1" = Money spent, "2" = Customers acquired
      const date = String(bundle["0"] || "").trim();
      if (!date) continue;

      const spend = parseNumber(bundle["1"]);
      const customers = Math.round(parseNumber(bundle["2"]));

      const costPerClient = customers > 0
        ? Math.round((spend / customers) * 100) / 100
        : 0;

      dateMap.set(date, { date, spend, customers, costPerClient });
    }

    const rows = Array.from(dateMap.values());

    const totalSpend = Math.round(
      rows.reduce((sum, r) => sum + r.spend, 0) * 100
    ) / 100;
    const totalCustomers = rows.reduce((sum, r) => sum + r.customers, 0);
    const averageCostPerClient =
      totalCustomers > 0
        ? Math.round((totalSpend / totalCustomers) * 100) / 100
        : 0;

    res.json({
      rows,
      summary: {
        totalSpend,
        totalCustomers,
        averageCostPerClient,
      },
    });
  } catch (error) {
    console.error("CPC controller error:", error.message);
    res.status(500).json({ error: "Failed to fetch CPC data" });
  }
}

module.exports = { getCpc };
