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
const getMonthlyChurnRate = async (req, res) => {
  try {
    const allSubscriptions = await fetchAllSubscriptions();

    // Calculate last 30 days period
    const now = Math.floor(Date.now() / 1000);
    const periodStart = now - 30 * 24 * 60 * 60; // Exactly 30 days ago

    // Active clients at start of period (30 days ago)
    const activeAtStart = allSubscriptions.filter(
      (sub) =>
        sub.activated_at &&
        sub.activated_at <= periodStart &&
        (!sub.cancelled_at || sub.cancelled_at > periodStart),
    );
    const activeCountAtStart = new Set(activeAtStart.map((s) => s.customer_id))
      .size;

    // Cancellations in last 30 days
    const cancelledSubs = allSubscriptions.filter(
      (sub) =>
        sub.cancelled_at &&
        sub.cancelled_at >= periodStart &&
        sub.cancelled_at <= now,
    );
    const cancellationsCount = new Set(cancelledSubs.map((s) => s.customer_id))
      .size;

    // Calculate churn rate
    const churnRate =
      activeCountAtStart > 0
        ? (cancellationsCount / activeCountAtStart) * 100
        : 0;

    res.json({
      monthlyChurnRate: {
        churnRate,
        activeClientsAtStart: activeCountAtStart,
        cancellationsLast30Days: cancellationsCount,
      },
    });
  } catch (error) {
    console.error("Monthly Churn Rate API Error:", error);
    res.status(500).json({ error: "Failed to fetch churn rate data" });
  }
};

module.exports = { getMonthlyChurnRate };
