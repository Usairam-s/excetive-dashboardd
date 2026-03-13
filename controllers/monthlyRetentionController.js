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
const getMonthlyRetention = async (req, res) => {
  try {
    const allSubscriptions = await fetchAllSubscriptions();
    const now = Math.floor(Date.now() / 1000);

    // Define time periods for cohorts
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60);
    const oneTwentyDaysAgo = now - (120 * 24 * 60 * 60);

    // Month 2 Cohort: Clients who enrolled 60-90 days ago
    const enrolledMonth2 = allSubscriptions.filter(
      (sub) => sub.created_at <= sixtyDaysAgo && sub.created_at > ninetyDaysAgo,
    );
    
    const stillActiveMonth2 = enrolledMonth2.filter(
      (sub) => sub.status === "active",
    );
    
    const month2EnrolledCount = new Set(enrolledMonth2.map(s => s.customer_id)).size;
    const month2ActiveCount = new Set(stillActiveMonth2.map(s => s.customer_id)).size;
    const month2Retention = month2EnrolledCount > 0 
      ? (month2ActiveCount / month2EnrolledCount) * 100 
      : 0;

    // Month 3 Cohort: Clients who enrolled 90-120 days ago
    const enrolledMonth3 = allSubscriptions.filter(
      (sub) => sub.created_at <= ninetyDaysAgo && sub.created_at > oneTwentyDaysAgo,
    );
    
    const stillActiveMonth3 = enrolledMonth3.filter(
      (sub) => sub.status === "active",
    );
    
    const month3EnrolledCount = new Set(enrolledMonth3.map(s => s.customer_id)).size;
    const month3ActiveCount = new Set(stillActiveMonth3.map(s => s.customer_id)).size;
    const month3Retention = month3EnrolledCount > 0 
      ? (month3ActiveCount / month3EnrolledCount) * 100 
      : 0;

    res.json({
      monthlyRetention: {
        month2: {
          retentionRate: month2Retention,
          enrolled: month2EnrolledCount,
          stillActive: month2ActiveCount,
        },
        month3: {
          retentionRate: month3Retention,
          enrolled: month3EnrolledCount,
          stillActive: month3ActiveCount,
        },
      },
    });
  } catch (error) {
    console.error("Monthly Retention API Error:", error);
    res.status(500).json({ error: "Failed to fetch retention data" });
  }
};

module.exports = { getMonthlyRetention };
