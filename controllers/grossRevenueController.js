const axios = require("axios");

const CHARGEBEE_SITE = "americacreditcare";
const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";
const SALARY_WEBHOOK_URL =
  "https://hook.eu1.make.com/91jqb1524eh9kdlsyrari2g2pj0mfkg7";

// Fetch weekly salary from webhook
async function fetchWeeklySalary() {
  try {
    const response = await axios.get(SALARY_WEBHOOK_URL);
    const data = response.data.result || [];
    const total = data.reduce((sum, item) => {
      const value = Object.values(item)[0];
      const numericValue = parseFloat(value.replace(/[$,]/g, ""));
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);
    return total;
  } catch (error) {
    console.error("Error fetching salary:", error.message);
    return 0;
  }
}

// Calculate salary to subtract based on filter period
function calculateSalaryToSubtract(weeklySalary, filterStart, filterEnd) {
  const dailySalary = weeklySalary / 7;

  // Calculate number of days in the filter period
  const periodSeconds = filterEnd - filterStart;
  const periodDays = periodSeconds / (24 * 60 * 60);

  // Clamp to max 7 days (one week)
  const daysToCharge = Math.min(Math.ceil(periodDays), 7);

  return dailySalary * daysToCharge;
}

// Fetch differential prices
async function fetchDifferentialPrices() {
  const response = await axios.get(
    `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/differential_prices`,
    {
      auth: { username: CHARGEBEE_API_KEY, password: "" },
    },
  );
  return response.data.list.map((item) => item.differential_price);
}

// Fetch all subscriptions
async function fetchAllSubscriptions() {
  const subscriptions = [];
  let offset = null;

  for (let i = 0; i < 20; i++) {
    const params = { limit: 100 };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      {
        auth: { username: CHARGEBEE_API_KEY, password: "" },
        params,
      },
    );

    subscriptions.push(...response.data.list.map((item) => item.subscription));
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
}

// Fetch all transactions
async function fetchAllTransactions() {
  const transactions = [];
  let offset = null;

  for (let i = 0; i < 50; i++) {
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
}

// Get processing fee for a plan
function getProcessingFee(planId, differentialPrices) {
  const feeMapping = differentialPrices.find(
    (dp) => dp.parent_item_id === planId,
  );
  return feeMapping ? feeMapping.price / 100 : 0;
}

// Get customer plan
function getCustomerPlan(customerId, subscriptionId, allSubscriptions) {
  const subscription = allSubscriptions.find(
    (sub) => sub.customer_id === customerId || sub.id === subscriptionId,
  );

  if (subscription && subscription.subscription_items) {
    const planItem = subscription.subscription_items.find(
      (item) => item.item_type === "plan",
    );
    return planItem ? planItem.item_price_id.replace("-USD-Monthly", "") : null;
  }
  return null;
}

// Calculate active clients
function calculateActiveClients(allSubscriptions) {
  const activeCustomerIds = new Set();
  allSubscriptions.forEach((sub) => {
    if (sub.status === "active") {
      activeCustomerIds.add(sub.customer_id);
    }
  });
  return activeCustomerIds.size;
}

// Get date range for period
function getDateRange(period) {
  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const currentTime = Math.floor(Date.now() / 1000);
  let startDate;

  if (period === "daily") {
    // Daily = Today (current calendar day: 00:00 → now)
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        5,
        0,
        0,
        0, // 5 AM UTC = Midnight NY
      ),
    );
    startDate = Math.floor(todayStart.getTime() / 1000);
  } else if (period === "weekly") {
    // Weekly = This week (Monday 00:00 → now)
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
        0, // 5 AM UTC = Midnight NY on Monday
      ),
    );
    startDate = Math.floor(weekStart.getTime() / 1000);
  } else {
    // Monthly = This month (1st of month 00:00 → now)
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
    );
    startDate = Math.floor(monthStart.getTime() / 1000);
  }

  return { startDate, endDate: currentTime };
}

// Calculate revenue for period
async function calculateRevenue(
  period,
  allTransactions,
  allSubscriptions,
  differentialPrices,
  weeklySalary,
) {
  const { startDate, endDate } = getDateRange(period);

  // Filter transactions for the selected period
  const periodTransactions = allTransactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate,
  );

  // Find each customer's payment history
  const customerPayments = new Map();
  allTransactions.forEach((tx) => {
    if (!customerPayments.has(tx.customer_id)) {
      customerPayments.set(tx.customer_id, []);
    }
    customerPayments.get(tx.customer_id).push(tx);
  });

  // Sort each customer's payments by date
  customerPayments.forEach((payments) => {
    payments.sort((a, b) => a.date - b.date);
  });

  // Find first payment date for each customer
  const customerFirstPayment = new Map();
  customerPayments.forEach((payments, customerId) => {
    customerFirstPayment.set(customerId, payments[0].date);
  });

  // Classify each transaction in the period
  let newRevenue = 0,
    existingRevenue = 0,
    recoveryRevenue = 0;
  let netNewRevenue = 0,
    netExistingRevenue = 0,
    netRecoveryRevenue = 0;
  let totalProcessingFees = 0;

  const thirtyDays = 30 * 24 * 60 * 60;
  const recoveryGap = 60 * 24 * 60 * 60;

  periodTransactions.forEach((tx) => {
    const firstPaymentDate = customerFirstPayment.get(tx.customer_id);
    const customerHistory = customerPayments.get(tx.customer_id);
    const amount = tx.amount / 100;

    // Get customer's plan and processing fee
    const planId = getCustomerPlan(
      tx.customer_id,
      tx.subscription_id,
      allSubscriptions,
    );
    const processingFee = getProcessingFee(planId, differentialPrices);
    const netAmount = amount - processingFee;
    totalProcessingFees += processingFee;

    // Check if this is a recovery
    let isRecovery = false;
    for (let i = 1; i < customerHistory.length; i++) {
      const gap = customerHistory[i].date - customerHistory[i - 1].date;
      if (gap > recoveryGap && customerHistory[i].id === tx.id) {
        isRecovery = true;
        break;
      }
    }

    if (isRecovery) {
      recoveryRevenue += amount;
      netRecoveryRevenue += netAmount;
    } else {
      const daysSinceFirstPayment =
        (tx.date - firstPaymentDate) / (24 * 60 * 60);
      if (daysSinceFirstPayment <= 30) {
        newRevenue += amount;
        netNewRevenue += netAmount;
      } else {
        existingRevenue += amount;
        netExistingRevenue += netAmount;
      }
    }
  });

  // Calculate salary to subtract
  const salaryToSubtract = calculateSalaryToSubtract(
    weeklySalary,
    startDate,
    endDate,
  );

  const totalNetRevenue =
    netNewRevenue + netExistingRevenue + netRecoveryRevenue - salaryToSubtract;
  const activeClients = calculateActiveClients(allSubscriptions);
  const revenuePerClient =
    activeClients > 0 ? totalNetRevenue / activeClients : 0;

  return {
    newRevenue,
    existingRevenue,
    recoveryRevenue,
    totalNetRevenue,
    totalProcessingFees,
    totalSalary: salaryToSubtract,
    activeClients,
    revenuePerClient,
    period,
    startDate,
    endDate,
  };
}

// Main controller function
const getGrossRevenue = async (req, res) => {
  try {
    // Fetch all data in parallel
    const [transactions, subscriptions, diffPrices, weeklySalary] =
      await Promise.all([
        fetchAllTransactions(),
        fetchAllSubscriptions(),
        fetchDifferentialPrices(),
        fetchWeeklySalary(),
      ]);

    // Calculate revenue data for all periods
    const dailyData = await calculateRevenue(
      "daily",
      transactions,
      subscriptions,
      diffPrices,
      weeklySalary,
    );
    const weeklyData = await calculateRevenue(
      "weekly",
      transactions,
      subscriptions,
      diffPrices,
      weeklySalary,
    );
    const monthlyData = await calculateRevenue(
      "monthly",
      transactions,
      subscriptions,
      diffPrices,
      weeklySalary,
    );

    res.json({
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    });
  } catch (error) {
    console.error("Gross Revenue API Error:", error);
    res.status(500).json({ error: "Failed to fetch gross revenue data" });
  }
};

module.exports = { getGrossRevenue };
