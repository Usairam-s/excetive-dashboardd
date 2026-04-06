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
    const { selectedDate, dateFilter } = req.query;

    // Validate selectedDate format when provided
    if (selectedDate && !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({ error: "selectedDate must be YYYY-MM-DD" });
    }

    const allSubscriptions = await fetchAllSubscriptions();

    // Determine the reference "now" point:
    // custom date → end of that NY day; otherwise → true now
    let refTime;
    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-").map(Number);
      // End of the selected NY day = next UTC 05:00 minus 1 second
      const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 0));
      refTime = Math.floor(dayEnd.getTime() / 1000);
    } else {
      refTime = Math.floor(Date.now() / 1000);
    }

    const last90Days = refTime - 90 * 24 * 60 * 60;

    // Count active clients as of refTime
    const activeClients = allSubscriptions.filter(
      (sub) =>
        sub.status === "active" &&
        (!sub.activated_at || sub.activated_at <= refTime),
    );
    const activeCount = new Set(activeClients.map((sub) => sub.customer_id))
      .size;

    // Count cancellations in the 90-day window ending at refTime
    const cancelledSubs = allSubscriptions.filter(
      (sub) =>
        sub.cancelled_at &&
        sub.cancelled_at >= last90Days &&
        sub.cancelled_at <= refTime,
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
