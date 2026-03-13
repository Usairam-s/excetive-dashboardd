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
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params },
    );

    transactions.push(...response.data.list.map((item) => item.transaction));
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return transactions;
}

// Get first payment date for a customer
function getFirstPaymentDate(customerId, allTransactions) {
  const customerTransactions = allTransactions
    .filter((tx) => tx.customer_id === customerId)
    .sort((a, b) => a.date - b.date);

  return customerTransactions.length > 0 ? customerTransactions[0].date : null;
}

// Main controller function
const getWeeklySignupPaidConversion = async (req, res) => {
  try {
    const [allSubscriptions, allTransactions] = await Promise.all([
      fetchAllSubscriptions(),
      fetchAllTransactions(),
    ]);

    // Calculate last 7 days period
    const now = Math.floor(Date.now() / 1000);
    const last7Days = now - (7 * 24 * 60 * 60);

    // Get signups (enrolled) from last 7 days
    const signups = allSubscriptions.filter(
      (sub) => sub.created_at >= last7Days && sub.created_at <= now,
    );

    let paidWithin7Days = 0;
    let paidWithin14Days = 0;

    // Check each signup for payment within 7 and 14 days
    signups.forEach((sub) => {
      const signupDate = sub.created_at;
      const firstPaymentDate = getFirstPaymentDate(sub.customer_id, allTransactions);

      if (firstPaymentDate) {
        const daysDiff = (firstPaymentDate - signupDate) / (24 * 60 * 60);

        if (daysDiff <= 7) {
          paidWithin7Days++;
          paidWithin14Days++; // Also counts for 14-day
        } else if (daysDiff <= 14) {
          paidWithin14Days++;
        }
      }
    });

    const totalEnrolled = signups.length;
    const conversion7DayRate = totalEnrolled > 0 ? (paidWithin7Days / totalEnrolled) * 100 : 0;
    const conversion14DayRate = totalEnrolled > 0 ? (paidWithin14Days / totalEnrolled) * 100 : 0;

    res.json({
      signupToPaidConversion: {
        totalEnrolled,
        paidWithin7Days,
        paidWithin14Days,
        conversion7DayRate,
        conversion14DayRate,
      },
    });
  } catch (error) {
    console.error("Weekly Signup Paid Conversion API Error:", error);
    res.status(500).json({ error: "Failed to fetch conversion data" });
  }
};

module.exports = { getWeeklySignupPaidConversion };
