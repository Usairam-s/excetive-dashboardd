const axios = require("axios");

const CHARGEBEE_SITE = "americacreditcare";
const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

const fetchTrialSubscriptionsWithRange = async (dateRange) => {
  const subscriptions = [];
  let offset = null;

  while (true) {
    const params = {
      limit: 100,
      "status[is]": "in_trial",
      "created_at[after]": dateRange.start,
      "created_at[before]": dateRange.end,
    };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params }
    );

    subscriptions.push(...response.data.list);
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
};

const fetchActiveSubscriptionsWithRange = async (dateRange) => {
  const subscriptions = [];
  let offset = null;

  while (true) {
    const params = {
      limit: 100,
      "status[is]": "active",
      "activated_at[after]": dateRange.start,
      "activated_at[before]": dateRange.end,
    };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params }
    );

    subscriptions.push(...response.data.list);
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
};

const fetchCancelledSubscriptionsWithRange = async (dateRange) => {
  const subscriptions = [];
  let offset = null;

  while (true) {
    const params = {
      limit: 100,
      "status[is]": "cancelled",
      "cancelled_at[after]": dateRange.start,
      "cancelled_at[before]": dateRange.end,
    };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params }
    );

    subscriptions.push(...response.data.list);
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
};

const countUniqueCustomers = (subscriptions) => {
  const uniqueCustomers = new Set();
  subscriptions.forEach((item) => {
    uniqueCustomers.add(item.subscription.customer_id);
  });
  return uniqueCustomers.size;
};

const getWeeklyNetGrowth = async (req, res) => {
  try {
    const weeks = [];
    const now = new Date();

    // Calculate last 5 COMPLETE weeks (exclude current week)
    for (let weeksAgo = 5; weeksAgo >= 1; weeksAgo--) {
      const weekEnd = new Date(now);
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // Go back to last Sunday (end of last complete week)
      const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      weekEnd.setDate(now.getDate() - daysToLastSunday - (weeksAgo - 1) * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekRange = {
        start: Math.floor(weekStart.getTime() / 1000),
        end: Math.floor(weekEnd.getTime() / 1000),
      };

      const [trials, active, cancelled] = await Promise.all([
        fetchTrialSubscriptionsWithRange(weekRange),
        fetchActiveSubscriptionsWithRange(weekRange),
        fetchCancelledSubscriptionsWithRange(weekRange),
      ]);

      const newCustomers = countUniqueCustomers(trials) + countUniqueCustomers(active);
      const lostCustomers = countUniqueCustomers(cancelled);
      const netGrowth = newCustomers - lostCustomers;

      const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      weeks.push({
        week: weekLabel,
        newCustomers,
        lostCustomers,
        netGrowth,
      });
    }

    const totalGrowth = weeks.reduce((sum, w) => sum + w.netGrowth, 0);
    const avgGrowth = totalGrowth / weeks.length;

    res.json({
      weeks,
      summary: {
        totalGrowth: Math.round(totalGrowth),
        avgGrowth: Math.round(avgGrowth * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Weekly Net Growth Error:", error);
    res.status(500).json({ error: "Failed to fetch weekly net growth data" });
  }
};

module.exports = { getWeeklyNetGrowth };
