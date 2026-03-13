const axios = require("axios");

// Fetch all subscriptions
async function fetchAllSubscriptions() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";
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

// Calculate time ranges for alerts (independent of dashboard filters)
function getAlertTimeRanges() {
  const now = new Date();
  const nyOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

  // Last 7 complete days (for show rate and no-show loss)
  const last7DaysEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      5,
      0,
      0,
      0, // Today 5 AM UTC = Midnight NY
    ),
  );
  const last7DaysStart = new Date(last7DaysEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Last complete week (Monday to Sunday)
  const lastWeekEnd = new Date(last7DaysEnd.getTime());
  const daysFromLastMonday = (lastWeekEnd.getUTCDay() + 6) % 7; // Days since last Monday
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() - daysFromLastMonday);
  const lastWeekStart = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Previous complete week (for WoW comparison)
  const prevWeekEnd = new Date(lastWeekStart.getTime());
  const prevWeekStart = new Date(prevWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    last7Days: {
      start: Math.floor(last7DaysStart.getTime() / 1000),
      end: Math.floor(last7DaysEnd.getTime() / 1000),
    },
    lastWeek: {
      start: Math.floor(lastWeekStart.getTime() / 1000),
      end: Math.floor(lastWeekEnd.getTime() / 1000),
    },
    prevWeek: {
      start: Math.floor(prevWeekStart.getTime() / 1000),
      end: Math.floor(prevWeekEnd.getTime() / 1000),
    },
  };
}

// Get booked appointments for alert calculations
async function getBookedAppointmentsForAlerts(startDate, endDate) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  const [personalBooked, businessBooked] = await Promise.all([
    // Personal booked
    axios.post(
      apiUrl,
      {
        locationId,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              {
                field: "tags",
                operator: "eq",
                value: "confirmed_appointment_status_personal",
              },
              {
                field: "dateAdded",
                operator: "range",
                value: {
                  gte: new Date(startDate * 1000).toISOString(),
                  lte: new Date(endDate * 1000).toISOString(),
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    ),
    // Business booked
    axios.post(
      apiUrl,
      {
        locationId,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              {
                field: "tags",
                operator: "eq",
                value: "confirmed_appointment_status_business",
              },
              {
                field: "dateAdded",
                operator: "range",
                value: {
                  gte: new Date(startDate * 1000).toISOString(),
                  lte: new Date(endDate * 1000).toISOString(),
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    ),
  ]);

  return {
    personal: personalBooked.data.contacts.length,
    business: businessBooked.data.contacts.length,
    total: personalBooked.data.contacts.length + businessBooked.data.contacts.length,
  };
}

// Get showed appointments for alert calculations
async function getShowedAppointmentsForAlerts(startDate, endDate) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  const [personalShowed, businessShowed] = await Promise.all([
    // Personal showed
    axios.post(
      apiUrl,
      {
        locationId,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              {
                field: "tags",
                operator: "eq",
                value: "showed_appointment_status_personal",
              },
              {
                field: "dateAdded",
                operator: "range",
                value: {
                  gte: new Date(startDate * 1000).toISOString(),
                  lte: new Date(endDate * 1000).toISOString(),
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    ),
    // Business showed
    axios.post(
      apiUrl,
      {
        locationId,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              {
                field: "tags",
                operator: "eq",
                value: "showed_appointment_status_business",
              },
              {
                field: "dateAdded",
                operator: "range",
                value: {
                  gte: new Date(startDate * 1000).toISOString(),
                  lte: new Date(endDate * 1000).toISOString(),
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    ),
  ]);

  return {
    personal: personalShowed.data.contacts.length,
    business: businessShowed.data.contacts.length,
    total: personalShowed.data.contacts.length + businessShowed.data.contacts.length,
  };
}

// Get mishaps (no-show loss) for alert calculations
async function getMishapsForAlerts(startDate, endDate) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  // Get custom field IDs
  const customFieldsResponse = await axios.get(
    `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
      },
    },
  );

  const customFields = customFieldsResponse.data.customFields;
  const personalAmountFieldId = customFields.find(
    (f) => f.fieldKey === "contact.no_show_amount_personal",
  )?.id;
  const businessAmountFieldId = customFields.find(
    (f) => f.fieldKey === "contact.no_show_amount_business",
  )?.id;

  const mishapTags = [
    "cancelled_appointment_status_personal",
    "cancelled_appointment_status_business",
    "invalid_appointment_status_personal",
    "invalid_appointment_status_business",
    "no_show_appointment_status_personal",
    "no_show_appointment_status_business",
  ];

  const mishapContacts = await axios.post(
    apiUrl,
    {
      locationId,
      page: 1,
      pageLimit: 500,
      filters: [
        {
          group: "AND",
          filters: [
            {
              group: "OR",
              filters: mishapTags.map((tag) => ({
                field: "tags",
                operator: "eq",
                value: tag,
              })),
            },
            {
              field: "dateAdded",
              operator: "range",
              value: {
                gte: new Date(startDate * 1000).toISOString(),
                lte: new Date(endDate * 1000).toISOString(),
              },
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
    },
  );

  // Get detailed contact info for amount calculations
  const contactDetailsPromises = mishapContacts.data.contacts.map((contact) =>
    axios
      .get(`https://services.leadconnectorhq.com/contacts/${contact.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
        },
      })
      .then((res) => res.data.contact)
      .catch(() => null),
  );
  const contactDetails = (await Promise.all(contactDetailsPromises)).filter(
    (c) => c !== null,
  );

  const getAmount = (contact, fieldId) => {
    if (!fieldId || !contact.customFields) return 0;
    const field = contact.customFields.find((f) => f.id === fieldId);
    return field ? parseFloat(field.value) || 0 : 0;
  };

  const personalContacts = contactDetails.filter(
    (contact) =>
      contact.tags?.includes("cancelled_appointment_status_personal") ||
      contact.tags?.includes("invalid_appointment_status_personal") ||
      contact.tags?.includes("no_show_appointment_status_personal"),
  );

  const businessContacts = contactDetails.filter(
    (contact) =>
      contact.tags?.includes("cancelled_appointment_status_business") ||
      contact.tags?.includes("invalid_appointment_status_business") ||
      contact.tags?.includes("no_show_appointment_status_business"),
  );

  // Debug logging for personal contacts
  console.log("\n=== NO-SHOW LOSS DEBUG ===");
  console.log(`Total mishap contacts found: ${contactDetails.length}`);
  console.log(`\nPersonal Contacts: ${personalContacts.length}`);
  personalContacts.forEach((contact, index) => {
    const amount = getAmount(contact, personalAmountFieldId);
    const relevantTags = contact.tags?.filter(t => 
      t.includes('cancelled_appointment_status_personal') || 
      t.includes('invalid_appointment_status_personal') || 
      t.includes('no_show_appointment_status_personal')
    );
    console.log(`  ${index + 1}. ${contact.name || contact.email || contact.id}`);
    console.log(`     Amount: $${amount.toFixed(2)}`);
    console.log(`     Tags: ${relevantTags?.join(', ') || 'none'}`);
  });

  const personalAmount = personalContacts.reduce(
    (sum, c) => sum + getAmount(c, personalAmountFieldId),
    0,
  );

  // Debug logging for business contacts
  console.log(`\nBusiness Contacts: ${businessContacts.length}`);
  businessContacts.forEach((contact, index) => {
    const amount = getAmount(contact, businessAmountFieldId);
    const relevantTags = contact.tags?.filter(t => 
      t.includes('cancelled_appointment_status_business') || 
      t.includes('invalid_appointment_status_business') || 
      t.includes('no_show_appointment_status_business')
    );
    console.log(`  ${index + 1}. ${contact.name || contact.email || contact.id}`);
    console.log(`     Amount: $${amount.toFixed(2)}`);
    console.log(`     Tags: ${relevantTags?.join(', ') || 'none'}`);
  });

  const businessAmount = businessContacts.reduce(
    (sum, c) => sum + getAmount(c, businessAmountFieldId),
    0,
  );

  console.log(`\n--- SUMMARY ---`);
  console.log(`Personal Total: $${personalAmount.toFixed(2)} (${personalContacts.length} contacts)`);
  console.log(`Business Total: $${businessAmount.toFixed(2)} (${businessContacts.length} contacts)`);
  console.log(`GRAND TOTAL: $${(personalAmount + businessAmount).toFixed(2)}`);
  console.log(`=========================\n`);

  return {
    personal: { count: personalContacts.length, amount: personalAmount },
    business: { count: businessContacts.length, amount: businessAmount },
    totalAmount: personalAmount + businessAmount,
  };
}

// Fetch weekly salary
async function fetchWeeklySalary() {
  try {
    const response = await axios.get("https://hook.eu1.make.com/91jqb1524eh9kdlsyrari2g2pj0mfkg7");
    const data = response.data.result || [];
    return data.reduce((sum, item) => {
      const value = Object.values(item)[0];
      const numericValue = parseFloat(value.replace(/[$,]/g, ""));
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);
  } catch (error) {
    return 0;
  }
}

// Calculate salary for period
function calculateSalaryForPeriod(weeklySalary, startDate, endDate) {
  const dailySalary = weeklySalary / 7;
  const periodDays = (endDate - startDate) / (24 * 60 * 60);
  const daysToCharge = Math.min(Math.ceil(periodDays), 7);
  return dailySalary * daysToCharge;
}

// Fetch differential prices
async function fetchDifferentialPrices() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";
  const response = await axios.get(
    `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/differential_prices`,
    { auth: { username: CHARGEBEE_API_KEY, password: "" } },
  );
  return response.data.list.map((item) => item.differential_price);
}

// Get processing fee
function getProcessingFee(planId, differentialPrices) {
  const feeMapping = differentialPrices.find((dp) => dp.parent_item_id === planId);
  return feeMapping ? feeMapping.price / 100 : 0;
}

// Get customer plan
function getCustomerPlan(customerId, subscriptionId, allSubscriptions) {
  const subscription = allSubscriptions.find(
    (sub) => sub.customer_id === customerId || sub.id === subscriptionId,
  );
  if (subscription && subscription.subscription_items) {
    const planItem = subscription.subscription_items.find((item) => item.item_type === "plan");
    return planItem ? planItem.item_price_id.replace("-USD-Monthly", "") : null;
  }
  return null;
}

// Get net revenue and ARPU for WoW comparison
async function getRevenueAndARPUForAlerts(startDate, endDate, allTransactions, allSubscriptions, differentialPrices, weeklySalary) {
  const periodTransactions = allTransactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate,
  );

  const customerPayments = new Map();
  allTransactions.forEach((tx) => {
    if (!customerPayments.has(tx.customer_id)) {
      customerPayments.set(tx.customer_id, []);
    }
    customerPayments.get(tx.customer_id).push(tx);
  });

  customerPayments.forEach((payments) => payments.sort((a, b) => a.date - b.date));

  const customerFirstPayment = new Map();
  customerPayments.forEach((payments, customerId) => {
    customerFirstPayment.set(customerId, payments[0].date);
  });

  let netRevenue = 0;
  const recoveryGap = 60 * 24 * 60 * 60;

  periodTransactions.forEach((tx) => {
    const firstPaymentDate = customerFirstPayment.get(tx.customer_id);
    const customerHistory = customerPayments.get(tx.customer_id);
    const amount = tx.amount / 100;

    const planId = getCustomerPlan(tx.customer_id, tx.subscription_id, allSubscriptions);
    const processingFee = getProcessingFee(planId, differentialPrices);
    const netAmount = amount - processingFee;

    let isRecovery = false;
    for (let i = 1; i < customerHistory.length; i++) {
      const gap = customerHistory[i].date - customerHistory[i - 1].date;
      if (gap > recoveryGap && customerHistory[i].id === tx.id) {
        isRecovery = true;
        break;
      }
    }

    netRevenue += netAmount;
  });

  const salaryToSubtract = calculateSalaryForPeriod(weeklySalary, startDate, endDate);
  const totalNetRevenue = netRevenue - salaryToSubtract;

  // Count active clients during this specific week period
  const activeCustomerIds = new Set();
  allSubscriptions.forEach((sub) => {
    // Client is active if subscription was active during this period
    if (sub.status === "active" || 
        (sub.activated_at && sub.activated_at <= endDate && 
         (!sub.cancelled_at || sub.cancelled_at >= startDate))) {
      activeCustomerIds.add(sub.customer_id);
    }
  });
  const activeClients = activeCustomerIds.size;
  const arpu = activeClients > 0 ? totalNetRevenue / activeClients : 0;

  return { netRevenue: totalNetRevenue, arpu, activeClients };
}

// Fetch all transactions
async function fetchAllTransactions() {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";
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

// Main alerts controller function
const getAlerts = async (req, res) => {
  try {
    const timeRanges = getAlertTimeRanges();
    const alerts = [];

    // 1. Show Rate Alert (< 55%)
    const [last7DaysBooked, last7DaysShowed] = await Promise.all([
      getBookedAppointmentsForAlerts(timeRanges.last7Days.start, timeRanges.last7Days.end),
      getShowedAppointmentsForAlerts(timeRanges.last7Days.start, timeRanges.last7Days.end),
    ]);

    const showRate = last7DaysBooked.total > 0 
      ? (last7DaysShowed.total / last7DaysBooked.total) * 100 
      : 0;

    if (showRate < 55) {
      alerts.push({
        type: "show_rate",
        severity: "high",
        message: `🔴 Show Rate: ${showRate.toFixed(1)}% (Target: 55%)`,
        value: showRate,
        threshold: 55,
      });
    }

    // 2. No-show Loss Alert (> $1,000)
    const mishaps = await getMishapsForAlerts(timeRanges.last7Days.start, timeRanges.last7Days.end);
    
    if (mishaps.totalAmount > 1000) {
      alerts.push({
        type: "noshow_loss",
        severity: "high",
        message: `🔴 No-show Loss: $${mishaps.totalAmount.toLocaleString()} (Threshold: $1,000)`,
        value: mishaps.totalAmount,
        threshold: 1000,
      });
    }

    // Fetch data for revenue and ARPU calculations
    const [allTransactions, allSubscriptions, differentialPrices, weeklySalary] = await Promise.all([
      fetchAllTransactions(),
      fetchAllSubscriptions(),
      fetchDifferentialPrices(),
      fetchWeeklySalary(),
    ]);

    // 3. Net Revenue WoW Alert (any decline)
    const [lastWeekData, prevWeekData] = await Promise.all([
      getRevenueAndARPUForAlerts(timeRanges.lastWeek.start, timeRanges.lastWeek.end, allTransactions, allSubscriptions, differentialPrices, weeklySalary),
      getRevenueAndARPUForAlerts(timeRanges.prevWeek.start, timeRanges.prevWeek.end, allTransactions, allSubscriptions, differentialPrices, weeklySalary),
    ]);

    if (lastWeekData.netRevenue < prevWeekData.netRevenue) {
      const decline = prevWeekData.netRevenue - lastWeekData.netRevenue;
      const declinePercent = prevWeekData.netRevenue > 0 ? (decline / prevWeekData.netRevenue) * 100 : 0;
      alerts.push({
        type: "revenue_decline",
        severity: "high",
        message: `🔴 Net Revenue Declined: -$${decline.toLocaleString()} (-${declinePercent.toFixed(1)}%) WoW`,
        value: lastWeekData.netRevenue,
        previousValue: prevWeekData.netRevenue,
        decline: decline,
      });
    }

    // 4. ARPU Drop Alert (> 10% WoW)
    if (prevWeekData.arpu > 0) {
      const arpuDecline = prevWeekData.arpu - lastWeekData.arpu;
      const arpuDeclinePercent = (arpuDecline / prevWeekData.arpu) * 100;
      
      if (arpuDeclinePercent > 10) {
        alerts.push({
          type: "arpu_decline",
          severity: "high",
          message: `🔴 ARPU Declined: -$${arpuDecline.toFixed(2)} (-${arpuDeclinePercent.toFixed(1)}%) WoW`,
          value: lastWeekData.arpu,
          previousValue: prevWeekData.arpu,
          decline: arpuDecline,
          declinePercent: arpuDeclinePercent,
        });
      }
    }
    
    console.log("Alerts Debug:", {
      timeRanges,
      showRate: showRate.toFixed(1),
      noShowLoss: mishaps.totalAmount,
      lastWeekRevenue: lastWeekData.netRevenue,
      prevWeekRevenue: prevWeekData.netRevenue,
      lastWeekARPU: lastWeekData.arpu,
      prevWeekARPU: prevWeekData.arpu,
      lastWeekActiveClients: lastWeekData.activeClients,
      prevWeekActiveClients: prevWeekData.activeClients,
      alertsGenerated: alerts.length,
    });

    res.json({
      alerts,
      timestamp: new Date().toISOString(),
      summary: {
        totalAlerts: alerts.length,
        highSeverity: alerts.filter(a => a.severity === "high").length,
      },
      metrics: {
        showRate: {
          value: showRate,
          threshold: 55,
          isAlert: showRate < 55,
        },
        arpu: {
          current: lastWeekData.arpu,
          previous: prevWeekData.arpu,
          declinePercent: prevWeekData.arpu > 0 ? ((prevWeekData.arpu - lastWeekData.arpu) / prevWeekData.arpu) * 100 : 0,
          threshold: 10,
          isAlert: prevWeekData.arpu > 0 && ((prevWeekData.arpu - lastWeekData.arpu) / prevWeekData.arpu) * 100 > 10,
        },
        revenue: {
          current: lastWeekData.netRevenue,
          previous: prevWeekData.netRevenue,
          declinePercent: prevWeekData.netRevenue > 0 ? ((prevWeekData.netRevenue - lastWeekData.netRevenue) / prevWeekData.netRevenue) * 100 : 0,
          isAlert: lastWeekData.netRevenue < prevWeekData.netRevenue,
        },
        noshowLoss: {
          value: mishaps.totalAmount,
          threshold: 1000,
          isAlert: mishaps.totalAmount > 1000,
        },
      },
    });
  } catch (error) {
    console.error("Alerts API Error:", error);
    res.status(500).json({ error: "Failed to fetch alerts data" });
  }
};

module.exports = { getAlerts };