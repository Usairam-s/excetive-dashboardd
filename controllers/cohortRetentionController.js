const axios = require("axios");

const CHARGEBEE_SITE = "americacreditcare";
const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

async function fetchAllSubscriptions() {
  const subscriptions = [];
  let offset = null;

  for (let i = 0; i < 20; i++) {
    const params = { limit: 100 };
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
      { auth: { username: CHARGEBEE_API_KEY, password: "" }, params }
    );

    subscriptions.push(...response.data.list.map((item) => item.subscription));
    if (!response.data.next_offset) break;
    offset = response.data.next_offset;
  }

  return subscriptions;
}

const getCohortRetention = async (req, res) => {
  try {
    const allSubscriptions = await fetchAllSubscriptions();
    const now = Math.floor(Date.now() / 1000);
    const cohorts = [];

    // Generate last 6 COMPLETE months (exclude current month)
    for (let monthsAgo = 6; monthsAgo >= 1; monthsAgo--) {
      const cohortDate = new Date();
      cohortDate.setMonth(cohortDate.getMonth() - monthsAgo);
      cohortDate.setDate(1);
      cohortDate.setHours(0, 0, 0, 0);

      const cohortStart = Math.floor(cohortDate.getTime() / 1000);
      const cohortEndDate = new Date(cohortDate);
      cohortEndDate.setMonth(cohortEndDate.getMonth() + 1);
      const cohortEnd = Math.floor(cohortEndDate.getTime() / 1000);

      const signupMonth = cohortDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Get subscriptions created in this cohort month
      const cohortSubs = allSubscriptions.filter(
        (sub) => sub.created_at >= cohortStart && sub.created_at < cohortEnd
      );

      // Get unique customers
      const cohortCustomers = new Set(cohortSubs.map((s) => s.customer_id));
      const totalSignups = cohortCustomers.size;

      if (totalSignups === 0) {
        cohorts.push({
          signupMonth,
          totalSignups: 0,
          m1: null,
          m2: null,
          m3: null,
          m4: null,
          m5: null,
          m6: null,
          activePercent: null,
        });
        continue;
      }

      // Calculate retention for M1-M6
      const retention = {};
      for (let m = 1; m <= 6; m++) {
        const checkDate = new Date(cohortDate);
        checkDate.setMonth(checkDate.getMonth() + m);
        checkDate.setMonth(checkDate.getMonth() + 1);
        checkDate.setDate(0); // Last day of the month
        const checkTimestamp = Math.floor(checkDate.getTime() / 1000);

        // Skip if check date is in the future
        if (checkTimestamp > now) {
          retention[`m${m}`] = null;
          continue;
        }

        // Count customers still active at this check date
        let activeCount = 0;
        cohortCustomers.forEach((customerId) => {
          const customerSubs = allSubscriptions.filter(
            (s) => s.customer_id === customerId
          );
          const wasActive = customerSubs.some(
            (sub) =>
              !sub.cancelled_at ||
              sub.cancelled_at > checkTimestamp ||
              sub.status === "active"
          );
          if (wasActive) activeCount++;
        });

        retention[`m${m}`] = ((activeCount / totalSignups) * 100).toFixed(1);
      }

      // Calculate current active %
      let currentActive = 0;
      cohortCustomers.forEach((customerId) => {
        const hasActiveSub = allSubscriptions.some(
          (s) => s.customer_id === customerId && s.status === "active"
        );
        if (hasActiveSub) currentActive++;
      });

      const activePercent = ((currentActive / totalSignups) * 100).toFixed(1);

      cohorts.push({
        signupMonth,
        totalSignups,
        m1: retention.m1,
        m2: retention.m2,
        m3: retention.m3,
        m4: retention.m4,
        m5: retention.m5,
        m6: retention.m6,
        activePercent,
      });
    }

    res.json({ cohorts });
  } catch (error) {
    console.error("Cohort Retention API Error:", error);
    res.status(500).json({ error: "Failed to fetch cohort retention data" });
  }
};

module.exports = { getCohortRetention };
