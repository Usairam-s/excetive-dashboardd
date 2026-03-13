const axios = require("axios");

const CHARGEBEE_SITE = "americacreditcare";
const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

// Fetch all subscriptions
async function fetchAllSubscriptions() {
  const subscriptions = [];
  let offset = null;

  for (let i = 0; i < 20; i++) {
    const params = { limit: 100 };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params },
    );

    subscriptions.push(...response.data.list.map((item) => item.subscription));
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
}

// Main controller function
const getEffectiveLifetime = async (req, res) => {
  try {
    const allSubscriptions = await fetchAllSubscriptions();

    // Count active clients (current snapshot)
    const activeClients = allSubscriptions.filter(
      (sub) => sub.status === "active",
    );
    const activeCount = new Set(activeClients.map((sub) => sub.customer_id))
      .size;

    // Calculate last 90 days timestamp
    const now = Math.floor(Date.now() / 1000);
    const last90Days = now - 90 * 24 * 60 * 60;

    // Count cancellations in last 90 days
    const cancelledSubs = allSubscriptions.filter(
      (sub) =>
        sub.cancelled_at &&
        sub.cancelled_at >= last90Days &&
        sub.cancelled_at <= now,
    );
    const cancelledCount = new Set(cancelledSubs.map((sub) => sub.customer_id))
      .size;

    // Calculate average monthly cancellations
    const avgMonthlyCancellations = cancelledCount / 3;

    // Calculate effective lifetime in months
    const effectiveLifetimeMonths =
      avgMonthlyCancellations > 0
        ? activeCount / avgMonthlyCancellations
        : null; // null if no cancellations (infinite lifetime)

    res.json({
      effectiveLifetime: {
        months: effectiveLifetimeMonths,
        activeClients: activeCount,
        last90DaysCancellations: cancelledCount,
        avgMonthlyCancellations: avgMonthlyCancellations,
      },
    });
  } catch (error) {
    console.error("Effective Lifetime API Error:", error);
    res.status(500).json({ error: "Failed to fetch effective lifetime data" });
  }
};

module.exports = { getEffectiveLifetime };
