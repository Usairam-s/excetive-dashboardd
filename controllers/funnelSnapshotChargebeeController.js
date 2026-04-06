const axios = require("axios");

const CHARGEBEE_SITE = "americacreditcare";
const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

// Helper: compute date range from dateFilter params
function getChargebeeDateRange(dateFilter, selectedDate, startDate, endDate) {
  const now = new Date();

  if (dateFilter === "range" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd, 5, 0, 0, 0);
    const endMs   = Date.UTC(ey, em - 1, ed + 1, 4, 59, 59, 999);
    return {
      startTs:  Math.floor(startMs / 1000),
      endTs:    Math.floor(endMs / 1000),
    };
  }

  if (dateFilter === "custom" && selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const startMs = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    const endMs   = Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999);
    return {
      startTs:  Math.floor(startMs / 1000),
      endTs:    Math.floor(endMs / 1000),
    };
  }

  // Presets
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday, 5, 0, 0, 0),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0),
  );

  let startMs;
  if (dateFilter === "this_week") startMs = weekStart.getTime();
  else if (dateFilter === "this_month") startMs = monthStart.getTime();
  else startMs = todayStart.getTime();

  const endMs = Date.now();
  return {
    startTs: Math.floor(startMs / 1000),
    endTs:   Math.floor(endMs / 1000),
  };
}

// Helper: fetch all subscriptions with date range
async function fetchAllSubscriptionsWithRange(dateRange) {
  const subscriptions = [];
  let offset = null;

  for (let i = 0; i < 20; i++) {
    const params = { limit: 100 };

    if (dateRange) {
      params["created_at[after]"] = dateRange.startTs;
      params["created_at[before]"] = dateRange.endTs;
    }

    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      {
        auth: { username: CHARGEBEE_API_KEY, password: "" },
        params,
      },
    );

    subscriptions.push(...response.data.list);
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
}

// Filtered: Get enrolled and paid
async function getEnrolledAndPaidFiltered(range) {
  const subs = await fetchAllSubscriptionsWithRange({ startTs: range.startTs, endTs: range.endTs });

  let enrolledCount = 0, enrolledRevenue = 0, paidCount = 0, paidRevenue = 0;
  subs.forEach((item) => {
    const sub = item.subscription;
    const planItem = sub.subscription_items?.[0];
    const amount = (planItem?.amount || 0) / 100;
    if (sub.status === "in_trial") {
      enrolledCount++;
      enrolledRevenue += amount;
    } else if (sub.status === "active") {
      paidCount++;
      paidRevenue += amount;
    }
  });

  return {
    enrolled: { count: enrolledCount, revenue: enrolledRevenue },
    paid:     { count: paidCount,     revenue: paidRevenue },
  };
}

// Filtered: Get pre-billing cancellations
async function getPreBillingCancellationFiltered(range) {
  const fetchCancelled = async () => {
    const subscriptions = [];
    let offset = null;
    for (let i = 0; i < 10; i++) {
      const params = { limit: 100, "status[is]": "cancelled" };
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
  };

  const fetchAllSubs = async () => {
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
  };

  const fetchTxns = async () => {
    const transactions = [];
    let offset = null;
    for (let i = 0; i < 50; i++) {
      const params = { limit: 100, "type[is]": "payment", "status[is]": "success" };
      if (offset) params.offset = offset;
      const response = await axios.get(
        `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/transactions`,
        { auth: { username: CHARGEBEE_API_KEY, password: "" }, params },
      );
      transactions.push(...response.data.list.map((item) => item.transaction));
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }
    return transactions;
  };

  const [cancelledSubs, allSubscriptions, allTransactions] = await Promise.all([
    fetchCancelled(),
    fetchAllSubs(),
    fetchTxns(),
  ]);

  const customersWithPayments = new Set(allTransactions.map((tx) => tx.customer_id));
  const preBillingCancellations = cancelledSubs.filter((sub) => !customersWithPayments.has(sub.customer_id));

  // ARPU calculation
  const totalNetRevenue = allTransactions.reduce((sum, tx) => sum + tx.amount / 100, 0);
  const activeCustomerIds = new Set();
  allSubscriptions.forEach((sub) => { if (sub.status === "active") activeCustomerIds.add(sub.customer_id); });
  const arpu = activeCustomerIds.size > 0 ? totalNetRevenue / activeCustomerIds.size : 297;

  // Filter by the requested date range
  const filtered = preBillingCancellations.filter(
    (sub) => sub.cancelled_at >= range.startTs && sub.cancelled_at <= range.endTs,
  );

  return { count: filtered.length, amount: filtered.length * arpu };
}

// Legacy: Get enrolled and paid for daily/weekly/monthly
async function getEnrolledAndPaidLegacy() {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday, 5, 0, 0, 0),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0),
  );

  const dailyRange = {
    startTs: Math.floor(todayStart.getTime() / 1000),
    endTs: Math.floor(Date.now() / 1000),
  };
  const weeklyRange = {
    startTs: Math.floor(weekStart.getTime() / 1000),
    endTs: Math.floor(Date.now() / 1000),
  };
  const monthlyRange = {
    startTs: Math.floor(monthStart.getTime() / 1000),
    endTs: Math.floor(Date.now() / 1000),
  };

  const [dailySubs, weeklySubs, monthlySubs] = await Promise.all([
    fetchAllSubscriptionsWithRange(dailyRange),
    fetchAllSubscriptionsWithRange(weeklyRange),
    fetchAllSubscriptionsWithRange(monthlyRange),
  ]);

  const processSubscriptions = (subs) => {
    let enrolledCount = 0, enrolledRevenue = 0, paidCount = 0, paidRevenue = 0;
    subs.forEach((item) => {
      const sub = item.subscription;
      const planItem = sub.subscription_items?.[0];
      const amount = (planItem?.amount || 0) / 100;
      if (sub.status === "in_trial") {
        enrolledCount++;
        enrolledRevenue += amount;
      } else if (sub.status === "active") {
        paidCount++;
        paidRevenue += amount;
      }
    });
    return {
      enrolled: { count: enrolledCount, revenue: enrolledRevenue },
      paid: { count: paidCount, revenue: paidRevenue },
    };
  };

  return {
    daily: processSubscriptions(dailySubs),
    weekly: processSubscriptions(weeklySubs),
    monthly: processSubscriptions(monthlySubs),
  };
}

// Legacy: Get pre-billing cancellations for daily/weekly/monthly
async function getPreBillingCancellationLegacy() {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday, 5, 0, 0, 0),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0),
  );
  const todayEnd = new Date();

  const fetchCancelled = async () => {
    const subscriptions = [];
    let offset = null;
    for (let i = 0; i < 10; i++) {
      const params = { limit: 100, "status[is]": "cancelled" };
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
  };

  const fetchAllSubs = async () => {
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
  };

  const fetchTxns = async () => {
    const transactions = [];
    let offset = null;
    for (let i = 0; i < 50; i++) {
      const params = { limit: 100, "type[is]": "payment", "status[is]": "success" };
      if (offset) params.offset = offset;
      const response = await axios.get(
        `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/transactions`,
        { auth: { username: CHARGEBEE_API_KEY, password: "" }, params },
      );
      transactions.push(...response.data.list.map((item) => item.transaction));
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }
    return transactions;
  };

  const [cancelledSubs, allSubscriptions, allTransactions] = await Promise.all([
    fetchCancelled(),
    fetchAllSubs(),
    fetchTxns(),
  ]);

  const customersWithPayments = new Set(allTransactions.map((tx) => tx.customer_id));
  const preBillingCancellations = cancelledSubs.filter((sub) => !customersWithPayments.has(sub.customer_id));

  // ARPU
  const totalNetRevenue = allTransactions.reduce((sum, tx) => sum + tx.amount / 100, 0);
  const activeCustomerIds = new Set();
  allSubscriptions.forEach((sub) => { if (sub.status === "active") activeCustomerIds.add(sub.customer_id); });
  const arpu = activeCustomerIds.size > 0 ? totalNetRevenue / activeCustomerIds.size : 297;

  // Filter by periods
  const filterByPeriod = (subscriptions, startDate, endDate) => {
    return subscriptions.filter((sub) => {
      const cancelledAt = sub.cancelled_at;
      return (
        cancelledAt >= Math.floor(startDate.getTime() / 1000) &&
        cancelledAt <= Math.floor(endDate.getTime() / 1000)
      );
    });
  };

  const dailyCancellations = filterByPeriod(preBillingCancellations, todayStart, todayEnd);
  const weeklyCancellations = filterByPeriod(preBillingCancellations, weekStart, todayEnd);
  const monthlyCancellations = filterByPeriod(preBillingCancellations, monthStart, todayEnd);

  return {
    daily: { count: dailyCancellations.length, amount: dailyCancellations.length * arpu },
    weekly: { count: weeklyCancellations.length, amount: weeklyCancellations.length * arpu },
    monthly: { count: monthlyCancellations.length, amount: monthlyCancellations.length * arpu },
    arpu: arpu,
  };
}

// Main handler
const getFunnelSnapshotChargebee = async (req, res) => {
  try {
    const { dateFilter, selectedDate, startDate, endDate } = req.query;

    // Filtered mode
    if (dateFilter) {
      const range = getChargebeeDateRange(dateFilter, selectedDate, startDate, endDate);
      const [enrolledPaidData, preBillingData] = await Promise.all([
        getEnrolledAndPaidFiltered(range),
        getPreBillingCancellationFiltered(range),
      ]);

      return res.json({
        custom: {
          enrolled: enrolledPaidData.enrolled,
          paid: enrolledPaidData.paid,
          preBillingCancellations: preBillingData,
        },
      });
    }

    // Legacy mode
    const [enrolledPaidData, preBillingData] = await Promise.all([
      getEnrolledAndPaidLegacy(),
      getPreBillingCancellationLegacy(),
    ]);

    res.json({
      enrolled: {
        daily: enrolledPaidData.daily.enrolled,
        weekly: enrolledPaidData.weekly.enrolled,
        monthly: enrolledPaidData.monthly.enrolled,
      },
      paid: {
        daily: enrolledPaidData.daily.paid,
        weekly: enrolledPaidData.weekly.paid,
        monthly: enrolledPaidData.monthly.paid,
      },
      preBillingCancellations: preBillingData,
    });
  } catch (error) {
    console.error("Funnel Snapshot Chargebee API Error:", error);
    res.status(500).json({ error: "Failed to fetch Chargebee funnel data" });
  }
};

module.exports = { getFunnelSnapshotChargebee };
