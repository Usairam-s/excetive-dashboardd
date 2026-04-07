const axios = require("axios");

// Helper: compute a single date range from dateFilter params
function getClientHealthDateRange(dateFilter, selectedDate, startDate, endDate) {
  const now = new Date();

  if (dateFilter === "range" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd, 5, 0, 0, 0);
    const endMs = Date.UTC(ey, em - 1, ed + 1, 4, 59, 59, 999);
    return {
      start: Math.floor(startMs / 1000),
      end: Math.floor(endMs / 1000),
    };
  }

  if (dateFilter === "custom" && selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const startMs = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    const endMs = Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999);
    return {
      start: Math.floor(startMs / 1000),
      end: Math.floor(endMs / 1000),
    };
  }

  // Presets: today, this_week, this_month
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
      5,
      0,
      0,
      0,
    ),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0),
  );

  let startMs;
  if (dateFilter === "this_week") startMs = weekStart.getTime();
  else if (dateFilter === "this_month") startMs = monthStart.getTime();
  else startMs = todayStart.getTime();

  return {
    start: Math.floor(startMs / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
}

// Filtered: single-range net client growth
async function getNetClientGrowthFiltered(range) {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  const fetchSubscriptions = async (status, dateField) => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
      };
      params["status[is]"] = status;
      params[`${dateField}[after]`] = range.start;
      params[`${dateField}[before]`] = range.end;

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
  };

  const [trials, active, cancelled] = await Promise.all([
    fetchSubscriptions("in_trial", "created_at"),
    fetchSubscriptions("active", "activated_at"),
    fetchSubscriptions("cancelled", "cancelled_at"),
  ]);

  const countUniqueCustomers = (subscriptions) => {
    const uniqueCustomers = new Set();
    subscriptions.forEach((item) => {
      uniqueCustomers.add(item.subscription.customer_id);
    });
    return uniqueCustomers.size;
  };

  const newClients = countUniqueCustomers(trials) + countUniqueCustomers(active);
  const lostClients = countUniqueCustomers(cancelled);
  return newClients - lostClients;
}

// Filtered: single-range active clients
async function getActiveClientsFiltered(range) {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  const subscriptions = [];
  let offset = null;

  while (true) {
    const params = {
      limit: 100,
      "status[is]": "active",
      "activated_at[after]": range.start,
      "activated_at[before]": range.end,
    };

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

  const uniqueCustomers = new Set();
  subscriptions.forEach((item) => {
    uniqueCustomers.add(item.subscription.customer_id);
  });

  return uniqueCustomers.size;
}

// Get net client growth from ChargeBee
async function getNetClientGrowth() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const nyNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Calculate period starts in America/New_York timezone
  const todayStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    nyNow.getDate(),
    0,
    0,
    0,
    0, // 12:00 AM NY time
  );

  const dayOfWeek = nyNow.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    nyNow.getDate() - daysFromMonday,
    0,
    0,
    0,
    0, // 12:00 AM NY time on Monday
  );

  const monthStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    1,
    0,
    0,
    0,
    0, // 12:00 AM NY time on 1st
  );

  // Convert to Unix timestamps for ChargeBee API
  const dailyRange = {
    start: Math.floor(todayStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
  const weeklyRange = {
    start: Math.floor(weekStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
  const monthlyRange = {
    start: Math.floor(monthStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };

  console.log("\n=== NET CLIENT GROWTH ===");
  console.log("Time ranges:");
  console.log(
    "Daily:",
    new Date(dailyRange.start * 1000),
    "to",
    new Date(dailyRange.end * 1000),
  );
  console.log(
    "Weekly:",
    new Date(weeklyRange.start * 1000),
    "to",
    new Date(weeklyRange.end * 1000),
  );
  console.log(
    "Monthly:",
    new Date(monthlyRange.start * 1000),
    "to",
    new Date(monthlyRange.end * 1000),
  );
  console.log("Unix timestamps:");
  console.log("Daily:", dailyRange.start, "to", dailyRange.end);
  console.log("Weekly:", weeklyRange.start, "to", weeklyRange.end);
  console.log("Monthly:", monthlyRange.start, "to", monthlyRange.end);

  // Fetch trial subscriptions with date range (REMOVED SORT PARAMETER)
  const fetchTrialSubscriptionsWithRange = async (dateRange) => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "status[is]": "in_trial",
      };

      if (dateRange) {
        params["created_at[after]"] = dateRange.start;
        params["created_at[before]"] = dateRange.end;
      }

      if (offset) params.offset = offset;

      console.log("Trial API params:", params);

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

    // Log sample data structure
    if (subscriptions.length > 0) {
      console.log(
        "Sample trial subscription:",
        JSON.stringify(subscriptions[0], null, 2),
      );
    }

    return subscriptions;
  };

  // Fetch active subscriptions with date range (REMOVED SORT PARAMETER)
  const fetchActiveSubscriptionsWithRange = async (dateRange) => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "status[is]": "active",
      };

      if (dateRange) {
        params["activated_at[after]"] = dateRange.start;
        params["activated_at[before]"] = dateRange.end;
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
  };

  // Fetch cancelled subscriptions with date range (REMOVED SORT PARAMETER)
  const fetchCancelledSubscriptionsWithRange = async (dateRange) => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "status[is]": "cancelled",
      };

      if (dateRange) {
        params["cancelled_at[after]"] = dateRange.start;
        params["cancelled_at[before]"] = dateRange.end;
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
  };

  // Get subscriptions for each period
  const [
    dailyTrials,
    dailyActive,
    dailyCancelled,
    weeklyTrials,
    weeklyActive,
    weeklyCancelled,
    monthlyTrials,
    monthlyActive,
    monthlyCancelled,
  ] = await Promise.all([
    fetchTrialSubscriptionsWithRange(dailyRange),
    fetchActiveSubscriptionsWithRange(dailyRange),
    fetchCancelledSubscriptionsWithRange(dailyRange),
    fetchTrialSubscriptionsWithRange(weeklyRange),
    fetchActiveSubscriptionsWithRange(weeklyRange),
    fetchCancelledSubscriptionsWithRange(weeklyRange),
    fetchTrialSubscriptionsWithRange(monthlyRange),
    fetchActiveSubscriptionsWithRange(monthlyRange),
    fetchCancelledSubscriptionsWithRange(monthlyRange),
  ]);

  console.log("Fetched subscriptions for net growth:");
  console.log(
    "Daily - Trials:",
    dailyTrials.length,
    "Active:",
    dailyActive.length,
    "Cancelled:",
    dailyCancelled.length,
  );
  console.log(
    "Weekly - Trials:",
    weeklyTrials.length,
    "Active:",
    weeklyActive.length,
    "Cancelled:",
    weeklyCancelled.length,
  );
  console.log(
    "Monthly - Trials:",
    monthlyTrials.length,
    "Active:",
    monthlyActive.length,
    "Cancelled:",
    monthlyCancelled.length,
  );

  // Count unique customers for each period
  const countUniqueCustomers = (subscriptions) => {
    const uniqueCustomers = new Set();
    subscriptions.forEach((item) => {
      uniqueCustomers.add(item.subscription.customer_id);
    });
    return uniqueCustomers.size;
  };

  // Calculate net growth for each period
  const calculateNetGrowth = (trials, active, cancelled) => {
    const newClients =
      countUniqueCustomers(trials) + countUniqueCustomers(active);
    const lostClients = countUniqueCustomers(cancelled);
    console.log(
      `New clients: ${countUniqueCustomers(trials)} (trials) + ${countUniqueCustomers(active)} (active) = ${newClients}`,
    );
    console.log(`Lost clients: ${lostClients}`);
    console.log(`Net growth: ${newClients - lostClients}`);
    return newClients - lostClients;
  };

  console.log("\nCalculating net growth:");
  console.log("DAILY:");
  const dailyGrowth = calculateNetGrowth(
    dailyTrials,
    dailyActive,
    dailyCancelled,
  );
  console.log("WEEKLY:");
  const weeklyGrowth = calculateNetGrowth(
    weeklyTrials,
    weeklyActive,
    weeklyCancelled,
  );
  console.log("MONTHLY:");
  const monthlyGrowth = calculateNetGrowth(
    monthlyTrials,
    monthlyActive,
    monthlyCancelled,
  );

  const result = {
    daily: dailyGrowth,
    weekly: weeklyGrowth,
    monthly: monthlyGrowth,
  };

  console.log("Final net client growth:", result);
  return result;
}

// Get active clients from ChargeBee
async function getActiveClients() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const nyNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Calculate period starts in America/New_York timezone
  const todayStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    nyNow.getDate(),
    0,
    0,
    0,
    0, // 12:00 AM NY time
  );

  const dayOfWeek = nyNow.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    nyNow.getDate() - daysFromMonday,
    0,
    0,
    0,
    0, // 12:00 AM NY time on Monday
  );

  const monthStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    1,
    0,
    0,
    0,
    0, // 12:00 AM NY time on 1st
  );

  // Convert to Unix timestamps for ChargeBee API
  const dailyRange = {
    start: Math.floor(todayStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
  const weeklyRange = {
    start: Math.floor(weekStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
  const monthlyRange = {
    start: Math.floor(monthStart.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };

  console.log("Time ranges:");
  console.log(
    "Daily:",
    new Date(dailyRange.start * 1000),
    "to",
    new Date(dailyRange.end * 1000),
  );
  console.log(
    "Weekly:",
    new Date(weeklyRange.start * 1000),
    "to",
    new Date(weeklyRange.end * 1000),
  );
  console.log(
    "Monthly:",
    new Date(monthlyRange.start * 1000),
    "to",
    new Date(monthlyRange.end * 1000),
  );

  // Fetch active subscriptions with date range (NO SORT PARAMETER)
  const fetchActiveSubscriptionsWithRange = async (dateRange) => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "status[is]": "active",
      };

      if (dateRange) {
        params["activated_at[after]"] = dateRange.start;
        params["activated_at[before]"] = dateRange.end;
      }

      if (offset) params.offset = offset;

      console.log("API params:", params);

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
  };

  // Fetch all active subscriptions (no date filter for total)
  const fetchAllActiveSubscriptions = async () => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "status[is]": "active",
      };

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
  };

  // Get subscriptions for each period
  const [dailySubs, weeklySubs, monthlySubs, allActiveSubs] = await Promise.all(
    [
      fetchActiveSubscriptionsWithRange(dailyRange),
      fetchActiveSubscriptionsWithRange(weeklyRange),
      fetchActiveSubscriptionsWithRange(monthlyRange),
      fetchAllActiveSubscriptions(),
    ],
  );

  console.log("Fetched subscriptions:");
  console.log("Daily:", dailySubs.length);
  console.log("Weekly:", weeklySubs.length);
  console.log("Monthly:", monthlySubs.length);
  console.log("Total:", allActiveSubs.length);

  // Count unique customers
  const countUniqueCustomers = (subscriptions) => {
    const uniqueCustomers = new Set();
    subscriptions.forEach((item) => {
      uniqueCustomers.add(item.subscription.customer_id);
    });
    return uniqueCustomers.size;
  };

  const result = {
    daily: countUniqueCustomers(dailySubs),
    weekly: countUniqueCustomers(weeklySubs),
    monthly: countUniqueCustomers(monthlySubs),
    total: countUniqueCustomers(allActiveSubs),
  };

  console.log("Unique customers:", result);

  return result;
}

// Get retention rate for last month
async function getRetentionRate() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const nyNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Calculate LAST MONTH dates in NY timezone
  const lastMonthStart = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 1,
    1,
    0,
    0,
    0,
    0, // 12:00 AM NY time on 1st of last month
  );

  const lastMonthEnd = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    0,
    23,
    59,
    59,
    999, // 11:59 PM NY time on last day of last month
  );

  const lastMonthStartTimestamp = Math.floor(lastMonthStart.getTime() / 1000);
  const lastMonthEndTimestamp = Math.floor(lastMonthEnd.getTime() / 1000);

  console.log("\n=== RETENTION RATE ===");
  console.log("Last month period:");
  console.log("Start:", new Date(lastMonthStartTimestamp * 1000));
  console.log("End:", new Date(lastMonthEndTimestamp * 1000));
  console.log(
    "Unix timestamps:",
    lastMonthStartTimestamp,
    "to",
    lastMonthEndTimestamp,
  );

  // Fetch all subscriptions to reconstruct who was active at month start
  const fetchAllSubscriptions = async () => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = { limit: 100 };
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
  };

  const allSubscriptions = await fetchAllSubscriptions();
  console.log(
    "Total subscriptions fetched for retention:",
    allSubscriptions.length,
  );

  // Find customers who were active at the START of last month
  const customersAtMonthStart = new Set();
  allSubscriptions.forEach((item) => {
    const sub = item.subscription;
    const activatedAt = sub.activated_at || sub.created_at;
    const cancelledAt = sub.cancelled_at;

    // Was active at month start if:
    // 1. Activated before or on month start AND
    // 2. Either not cancelled OR cancelled after month start
    if (
      activatedAt <= lastMonthStartTimestamp &&
      (!cancelledAt || cancelledAt > lastMonthStartTimestamp)
    ) {
      customersAtMonthStart.add(sub.customer_id);
    }
  });

  // Find customers who were still active at the END of last month
  const customersAtMonthEnd = new Set();
  allSubscriptions.forEach((item) => {
    const sub = item.subscription;
    const activatedAt = sub.activated_at || sub.created_at;
    const cancelledAt = sub.cancelled_at;

    // Was active at month end if:
    // 1. Activated before or on month end AND
    // 2. Either not cancelled OR cancelled after month end
    if (
      activatedAt <= lastMonthEndTimestamp &&
      (!cancelledAt || cancelledAt > lastMonthEndTimestamp)
    ) {
      customersAtMonthEnd.add(sub.customer_id);
    }
  });

  // Find customers who were active at BOTH start and end (retained)
  const retainedCustomers = new Set();
  customersAtMonthStart.forEach((customerId) => {
    if (customersAtMonthEnd.has(customerId)) {
      retainedCustomers.add(customerId);
    }
  });

  // Calculate retention rate
  const clientsAtStart = customersAtMonthStart.size;
  const clientsRetained = retainedCustomers.size;
  const retentionRate =
    clientsAtStart > 0 ? (clientsRetained / clientsAtStart) * 100 : 0;

  console.log("Retention calculation:");
  console.log("Clients at month start:", clientsAtStart);
  console.log("Clients at month end:", customersAtMonthEnd.size);
  console.log("Clients retained:", clientsRetained);
  console.log("Retention rate:", retentionRate.toFixed(2) + "%");

  const result = Math.round(retentionRate * 100) / 100; // Round to 2 decimal places
  console.log("Final retention rate:", result);
  return result;
}

// Get 90-day revenue projection
async function get90DayProjection() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const nyNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Calculate last 3 months date ranges in NY timezone
  const month1Start = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 3,
    1,
    0,
    0,
    0,
    0,
  );
  const month1End = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 2,
    0,
    23,
    59,
    59,
    999,
  );
  const month2Start = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 2,
    1,
    0,
    0,
    0,
    0,
  );
  const month2End = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 1,
    0,
    23,
    59,
    59,
    999,
  );
  const month3Start = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const month3End = new Date(
    nyNow.getFullYear(),
    nyNow.getMonth(),
    0,
    23,
    59,
    59,
    999,
  );

  console.log("\n=== 90-DAY PROJECTION ===");
  console.log("Last 3 months periods:");
  console.log("Month 1:", month1Start, "to", month1End);
  console.log("Month 2:", month2Start, "to", month2End);
  console.log("Month 3:", month3Start, "to", month3End);

  // Fetch all subscriptions and transactions
  const fetchAllSubscriptions = async () => {
    const subscriptions = [];
    let offset = null;

    while (true) {
      const params = { limit: 100 };
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
  };

  const fetchAllTransactions = async () => {
    const transactions = [];
    let offset = null;

    while (true) {
      const params = {
        limit: 100,
        "type[is]": "payment",
        "status[is]": "success",
      };
      if (offset) params.offset = offset;

      const response = await axios.get(
        `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/transactions`,
        {
          auth: { username: CHARGEBEE_API_KEY, password: "" },
          params,
        },
      );

      transactions.push(...response.data.list.map((item) => item.transaction));
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }

    return transactions;
  };

  const [allSubscriptions, allTransactions] = await Promise.all([
    fetchAllSubscriptions(),
    fetchAllTransactions(),
  ]);

  console.log("Fetched data for projection:");
  console.log("Total subscriptions:", allSubscriptions.length);
  console.log("Total transactions:", allTransactions.length);

  // Calculate ARPU
  const totalNetRevenue = allTransactions.reduce(
    (sum, tx) => sum + tx.amount / 100,
    0,
  );
  const activeCustomerIds = new Set();
  allSubscriptions.forEach((item) => {
    if (item.subscription.status === "active") {
      activeCustomerIds.add(item.subscription.customer_id);
    }
  });
  const currentActiveClients = activeCustomerIds.size;
  const arpu =
    currentActiveClients > 0 ? totalNetRevenue / currentActiveClients : 297;

  console.log("ARPU calculation:");
  console.log("Total revenue:", totalNetRevenue);
  console.log("Current active clients:", currentActiveClients);
  console.log("ARPU:", arpu);

  // Calculate net growth for last 3 months
  const calculateNetGrowthForMonth = (startTimestamp, endTimestamp) => {
    const newClients = new Set();
    const lostClients = new Set();

    allSubscriptions.forEach((item) => {
      const sub = item.subscription;
      const activatedAt = sub.activated_at || sub.created_at;
      const cancelledAt = sub.cancelled_at;

      // New clients (became active in this month)
      if (
        activatedAt >= startTimestamp &&
        activatedAt <= endTimestamp &&
        (sub.status === "active" || sub.status === "in_trial")
      ) {
        newClients.add(sub.customer_id);
      }

      // Lost clients (cancelled in this month)
      if (
        cancelledAt >= startTimestamp &&
        cancelledAt <= endTimestamp &&
        sub.status === "cancelled"
      ) {
        lostClients.add(sub.customer_id);
      }
    });

    return newClients.size - lostClients.size;
  };

  const month1Growth = calculateNetGrowthForMonth(
    Math.floor(month1Start.getTime() / 1000),
    Math.floor(month1End.getTime() / 1000),
  );
  const month2Growth = calculateNetGrowthForMonth(
    Math.floor(month2Start.getTime() / 1000),
    Math.floor(month2End.getTime() / 1000),
  );
  const month3Growth = calculateNetGrowthForMonth(
    Math.floor(month3Start.getTime() / 1000),
    Math.floor(month3End.getTime() / 1000),
  );

  // Calculate average new clients per month
  const avgNewClients = (month1Growth + month2Growth + month3Growth) / 3;

  console.log("Monthly growth:");
  console.log("Month 1 growth:", month1Growth);
  console.log("Month 2 growth:", month2Growth);
  console.log("Month 3 growth:", month3Growth);
  console.log("Average new clients per month:", avgNewClients);

  // Get retention rate
  const retentionRate = await getRetentionRate();
  const retentionTrend = Math.pow(retentionRate / 100, 3); // 3-month retention

  console.log("Retention data:");
  console.log("Monthly retention rate:", retentionRate + "%");
  console.log("3-month retention trend:", retentionTrend);

  // Apply formula: (Current Active Clients × ARPU × Retention Trend) + (Avg New Clients × ARPU × 3)
  const existingClientsRevenue = currentActiveClients * arpu * retentionTrend;
  const newClientsRevenue = avgNewClients * arpu * 3;
  const total90DayProjection = existingClientsRevenue + newClientsRevenue;

  console.log("90-day projection calculation:");
  console.log("Existing clients revenue:", existingClientsRevenue);
  console.log("New clients revenue:", newClientsRevenue);
  console.log("Total 90-day projection:", total90DayProjection);

  const result = Math.round(total90DayProjection * 100) / 100; // Round to 2 decimal places
  console.log("Final 90-day projection:", result);
  return result;
}

// Main controller function
const getClientBaseHealth = async (req, res) => {
  try {
    const { dateFilter, selectedDate, startDate, endDate } = req.query;

    if (dateFilter) {
      const range = getClientHealthDateRange(
        dateFilter,
        selectedDate,
        startDate,
        endDate,
      );

      const [activeClientsData, netClientGrowthData, retentionRateData, projectionData] =
        await Promise.all([
          getActiveClientsFiltered(range),
          getNetClientGrowthFiltered(range),
          getRetentionRate(),
          get90DayProjection(),
        ]);

      return res.json({
        custom: {
          activeClients: activeClientsData,
          netClientGrowth: netClientGrowthData,
          retentionRate: retentionRateData,
          ninetyDayProjection: projectionData,
        },
      });
    }

    const [
      activeClientsData,
      netClientGrowthData,
      retentionRateData,
      projectionData,
    ] = await Promise.all([
      getActiveClients(),
      getNetClientGrowth(),
      getRetentionRate(),
      get90DayProjection(),
    ]);

    res.json({
      activeClients: activeClientsData,
      netClientGrowth: netClientGrowthData,
      retentionRate: retentionRateData,
      ninetyDayProjection: projectionData,
    });
  } catch (error) {
    console.error("Client Base Health Error:", error);
    res.status(500).json({
      error: "Failed to fetch client base health data",
      details: error.message,
    });
  }
};

module.exports = {
  getClientBaseHealth,
};
