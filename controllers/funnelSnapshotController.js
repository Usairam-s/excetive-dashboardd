const axios = require("axios");

// Helper function to paginate through GHL contacts search API
async function fetchAllContactsPaginated(locationId, token, filters) {
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";
  const allContacts = [];
  let currentPage = 1;
  let totalFetched = 0;
  let total = 0;

  console.log(`[PAGINATION START] Fetching contacts with filters:`, JSON.stringify(filters, null, 2));

  do {
    console.log(`[PAGINATION] Requesting page ${currentPage}, pageLimit: 500`);
    
    const response = await axios.post(
      apiUrl,
      {
        locationId,
        page: currentPage,
        pageLimit: 500, // Max per request
        filters,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    );

    const contacts = response.data.contacts || [];
    total = response.data.total || 0;
    allContacts.push(...contacts);
    totalFetched += contacts.length;

    console.log(`[PAGINATION] Page ${currentPage} received: ${contacts.length} contacts`);
    console.log(`[PAGINATION] Total reported by API: ${total}, Total fetched so far: ${totalFetched}`);

    // Break if we've fetched all contacts or if there are no more results
    if (totalFetched >= total || contacts.length === 0) {
      console.log(`[PAGINATION END] Stopping. Total fetched: ${totalFetched}, Total available: ${total}`);
      break;
    }

    // Check if we're approaching the 10,000 record limit (standard pagination limit)
    if (totalFetched >= 10000) {
      console.warn(`Warning: Reached 10,000 contact limit for pagination. Consider implementing cursor-based pagination.`);
      break;
    }

    currentPage++;
  } while (true);

  console.log(`[PAGINATION COMPLETE] Returning ${allContacts.length} contacts`);
  return allContacts;
}

// Helper function to fetch subscriptions with date range
async function fetchAllSubscriptionsWithRange(dateRange) {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  const subscriptions = [];
  let offset = null;

  for (let i = 0; i < 20; i++) {
    const params = {
      limit: 100,
    };

    if (dateRange) {
      params["created_at[after]"] = dateRange.start; // TESTING: Use created_at instead of activated_at
      params["created_at[before]"] = dateRange.end;
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

// Helper: compute a single date range from dateFilter params
function getFunnelDateRange(dateFilter, selectedDate, startDate, endDate) {
  const now = new Date();

  if (dateFilter === "range" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd, 5, 0, 0, 0);
    const endMs   = Date.UTC(ey, em - 1, ed + 1, 4, 59, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
      startTs:  Math.floor(startMs / 1000),
      endTs:    Math.floor(endMs / 1000),
    };
  }

  if (dateFilter === "custom" && selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const startMs = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    const endMs   = Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
      startTs:  Math.floor(startMs / 1000),
      endTs:    Math.floor(endMs / 1000),
    };
  }

  // Presets: today, this_week, this_month
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
  else startMs = todayStart.getTime(); // "today" or fallback

  const endMs = Date.now();
  return {
    startISO: new Date(startMs).toISOString(),
    endISO:   new Date(endMs).toISOString(),
    startTs:  Math.floor(startMs / 1000),
    endTs:    Math.floor(endMs / 1000),
  };
}

// Single-period filtered versions of each data-fetch function

async function getLeadsFiltered(range) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";

  const filters = [
    {
      group: "AND",
      filters: [
        { field: "tags", operator: "eq", value: "new lead" },
        { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
      ],
    },
  ];

  const contacts = await fetchAllContactsPaginated(locationId, token, filters);
  return { count: contacts.length };
}

async function getBookedFiltered(range) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";

  const makeQuery = (tag) => {
    const filters = [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "eq", value: tag },
          { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
        ],
      },
    ];
    return fetchAllContactsPaginated(locationId, token, filters);
  };

  const [personal, business] = await Promise.all([
    makeQuery("confirmed_appointment_status_personal"),
    makeQuery("confirmed_appointment_status_business"),
  ]);

  return {
    personal: personal.length,
    business: business.length,
  };
}

async function getShowedFiltered(range) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";

  const makeQuery = (tag) => {
    const filters = [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "eq", value: tag },
          { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
        ],
      },
    ];
    return fetchAllContactsPaginated(locationId, token, filters);
  };

  const [personal, business] = await Promise.all([
    makeQuery("showed_appointment_status_personal"),
    makeQuery("showed_appointment_status_business"),
  ]);

  return {
    personal: personal.length,
    business: business.length,
  };
}

async function getEnrolledAndPaidFiltered(range) {
  const subs = await fetchAllSubscriptionsWithRange({ start: range.startTs, end: range.endTs });

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

async function getMishapsFiltered(range) {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  const customFieldsResponse = await axios.get(
    `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
    { headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" } },
  );
  const customFields = customFieldsResponse.data.customFields;
  const personalAmountFieldId = customFields.find((f) => f.fieldKey === "contact.no_show_amount_personal")?.id;
  const businessAmountFieldId = customFields.find((f) => f.fieldKey === "contact.no_show_amount_business")?.id;

  const mishapTags = [
    "cancelled_appointment_status_personal",
    "cancelled_appointment_status_business",
    "invalid_appointment_status_personal",
    "invalid_appointment_status_business",
    "no_show_appointment_status_personal",
    "no_show_appointment_status_business",
  ];

  const filters = [
    {
      group: "AND",
      filters: [
        { group: "OR", filters: mishapTags.map((tag) => ({ field: "tags", operator: "eq", value: tag })) },
        { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
      ],
    },
  ];

  const contacts = await fetchAllContactsPaginated(locationId, token, filters);

  const contactDetailsPromises = contacts.map((contact) =>
    axios
      .get(`https://services.leadconnectorhq.com/contacts/${contact.id}`, {
        headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" },
      })
      .then((res) => res.data.contact)
      .catch(() => null),
  );
  const allDetails = (await Promise.all(contactDetailsPromises)).filter((c) => c !== null);

  const getAmount = (contact, fieldId) => {
    if (!fieldId || !contact.customFields) return 0;
    const field = contact.customFields.find((f) => f.id === fieldId);
    return field ? parseFloat(field.value) || 0 : 0;
  };

  const personalContacts = allDetails.filter(
    (c) =>
      c.tags?.includes("cancelled_appointment_status_personal") ||
      c.tags?.includes("invalid_appointment_status_personal") ||
      c.tags?.includes("no_show_appointment_status_personal"),
  );
  const businessContacts = allDetails.filter(
    (c) =>
      c.tags?.includes("cancelled_appointment_status_business") ||
      c.tags?.includes("invalid_appointment_status_business") ||
      c.tags?.includes("no_show_appointment_status_business"),
  );

  return {
    personal: {
      count:  personalContacts.length,
      amount: personalContacts.reduce((sum, c) => sum + getAmount(c, personalAmountFieldId), 0),
    },
    business: {
      count:  businessContacts.length,
      amount: businessContacts.reduce((sum, c) => sum + getAmount(c, businessAmountFieldId), 0),
    },
  };
}

async function getPreBillingCancellationFiltered(range) {
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

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

// Get new leads
async function getLeads() {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();
  const nyOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

  // Calculate period starts in UTC (adding 5 hours to get NY midnight in UTC)
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

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
  );

  const todayEnd = new Date();

  // Use API-level filtering for all periods
  const [dailyContacts, weeklyContacts, monthlyContacts] = await Promise.all([
    // Daily
    fetchAllContactsPaginated(
      locationId,
      token,
      [
        {
          group: "AND",
          filters: [
            // {
            //   field: "tags",
            //   operator: "eq",
            //   value: "new lead",
            // },
            {
              field: "dateAdded",
              operator: "range",
              value: {
                gte: todayStart.toISOString(),
                lte: todayEnd.toISOString(),
              },
            },
          ],
        },
      ]
    ),
    // Weekly
    fetchAllContactsPaginated(
      locationId,
      token,
      [
        {
          group: "AND",
          filters: [
            {
              field: "tags",
              operator: "eq",
              value: "new lead",
            },
            {
              field: "dateAdded",
              operator: "range",
              value: {
                gte: weekStart.toISOString(),
                lte: todayEnd.toISOString(),
              },
            },
          ],
        },
      ]
    ),
    // Monthly
    fetchAllContactsPaginated(
      locationId,
      token,
      [
        {
          group: "AND",
          filters: [
            {
              field: "tags",
              operator: "eq",
              value: "new lead",
            },
            {
              field: "dateAdded",
              operator: "range",
              value: {
                gte: monthStart.toISOString(),
                lte: todayEnd.toISOString(),
              },
            },
          ],
        },
      ]
    ),
  ]);

  return {
    daily: dailyContacts.length,
    weekly: weeklyContacts.length,
    monthly: monthlyContacts.length,
  };
}

// Get booked appointments
async function getBookedAppointments() {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();

  // Calculate period starts in UTC (adding 5 hours to get NY midnight in UTC)
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

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
  );

  const todayEnd = new Date();

  // Use API-level filtering for all periods
  const [
    personalDaily,
    personalWeekly,
    personalMonthly,
    businessDaily,
    businessWeekly,
    businessMonthly,
  ] = await Promise.all([
    // Personal Daily
    fetchAllContactsPaginated(locationId, token, [
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
              gte: todayStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Personal Weekly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: weekStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Personal Monthly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: monthStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Daily
    fetchAllContactsPaginated(locationId, token, [
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
              gte: todayStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Weekly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: weekStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Monthly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: monthStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
  ]);

  return {
    personal: {
      daily: personalDaily.length,
      weekly: personalWeekly.length,
      monthly: personalMonthly.length,
    },
    business: {
      daily: businessDaily.length,
      weekly: businessWeekly.length,
      monthly: businessMonthly.length,
    },
  };
}

// Get showed appointments
async function getShowedAppointments() {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();

  // Calculate period starts in UTC (adding 5 hours to get NY midnight in UTC)
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

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
  );

  const todayEnd = new Date();

  // Use API-level filtering for all periods
  const [
    personalDaily,
    personalWeekly,
    personalMonthly,
    businessDaily,
    businessWeekly,
    businessMonthly,
  ] = await Promise.all([
    // Personal Daily
    fetchAllContactsPaginated(locationId, token, [
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
              gte: todayStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Personal Weekly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: weekStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Personal Monthly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: monthStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Daily
    fetchAllContactsPaginated(locationId, token, [
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
              gte: todayStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Weekly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: weekStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Business Monthly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: monthStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
  ]);

  return {
    personal: {
      daily: personalDaily.length,
      weekly: personalWeekly.length,
      monthly: personalMonthly.length,
    },
    business: {
      daily: businessDaily.length,
      weekly: businessWeekly.length,
      monthly: businessMonthly.length,
    },
  };
}

// Get enrolled and paid subscriptions
async function getEnrolledAndPaid() {
  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();

  // Calculate period starts in UTC (adding 5 hours to get NY midnight in UTC)
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

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
  );

  const dailyRange = {
    start: Math.floor(todayStart.getTime() / 1000),
    end: Math.floor(Date.now() / 1000),
  };
  const weeklyRange = {
    start: Math.floor(weekStart.getTime() / 1000),
    end: Math.floor(Date.now() / 1000),
  };
  const monthlyRange = {
    start: Math.floor(monthStart.getTime() / 1000),
    end: Math.floor(Date.now() / 1000),
  };

  const [dailySubs, weeklySubs, monthlySubs] = await Promise.all([
    fetchAllSubscriptionsWithRange(dailyRange),
    fetchAllSubscriptionsWithRange(weeklyRange),
    fetchAllSubscriptionsWithRange(monthlyRange),
  ]);

  const processSubscriptions = (subs) => {
    let enrolledCount = 0;
    let enrolledRevenue = 0;
    let paidCount = 0;
    let paidRevenue = 0;

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

// Get mishaps
async function getMishaps() {
  const locationId = "bPdsUgmB6j1uqMsb9EXG";
  const token = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";

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

  // Get current time in America/New_York timezone (GMT-5)
  const now = new Date();

  // Calculate period starts in UTC (adding 5 hours to get NY midnight in UTC)
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

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5, 0, 0, 0), // 5 AM UTC = Midnight NY on 1st
  );

  const todayEnd = new Date();

  // Use API-level filtering for all periods and tags
  const mishapTags = [
    "cancelled_appointment_status_personal",
    "cancelled_appointment_status_business",
    "invalid_appointment_status_personal",
    "invalid_appointment_status_business",
    "no_show_appointment_status_personal",
    "no_show_appointment_status_business",
  ];

  const [dailyContacts, weeklyContacts, monthlyContacts] = await Promise.all([
    // Daily
    fetchAllContactsPaginated(locationId, token, [
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
              gte: todayStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Weekly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: weekStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
    // Monthly
    fetchAllContactsPaginated(locationId, token, [
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
              gte: monthStart.toISOString(),
              lte: todayEnd.toISOString(),
            },
          },
        ],
      },
    ]),
  ]);

  // Get detailed contact info for amount calculations
  const getContactDetails = async (contacts) => {
    const contactDetailsPromises = contacts.map((contact) =>
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
    return (await Promise.all(contactDetailsPromises)).filter(
      (c) => c !== null,
    );
  };

  const [dailyDetails, weeklyDetails, monthlyDetails] = await Promise.all([
    getContactDetails(dailyContacts),
    getContactDetails(weeklyContacts),
    getContactDetails(monthlyContacts),
  ]);

  const getAmount = (contact, fieldId) => {
    if (!fieldId || !contact.customFields) return 0;
    const field = contact.customFields.find((f) => f.id === fieldId);
    return field ? parseFloat(field.value) || 0 : 0;
  };

  const processContacts = (contacts) => {
    const personalContacts = contacts.filter(
      (contact) =>
        contact.tags?.includes("cancelled_appointment_status_personal") ||
        contact.tags?.includes("invalid_appointment_status_personal") ||
        contact.tags?.includes("no_show_appointment_status_personal"),
    );

    const businessContacts = contacts.filter(
      (contact) =>
        contact.tags?.includes("cancelled_appointment_status_business") ||
        contact.tags?.includes("invalid_appointment_status_business") ||
        contact.tags?.includes("no_show_appointment_status_business"),
    );

    const personalAmount = personalContacts.reduce(
      (sum, c) => sum + getAmount(c, personalAmountFieldId),
      0,
    );
    const businessAmount = businessContacts.reduce(
      (sum, c) => sum + getAmount(c, businessAmountFieldId),
      0,
    );

    return {
      personal: { count: personalContacts.length, amount: personalAmount },
      business: { count: businessContacts.length, amount: businessAmount },
    };
  };

  const dailyResults = processContacts(dailyDetails);
  const weeklyResults = processContacts(weeklyDetails);
  const monthlyResults = processContacts(monthlyDetails);

  return {
    personal: {
      daily: dailyResults.personal,
      weekly: weeklyResults.personal,
      monthly: monthlyResults.personal,
    },
    business: {
      daily: dailyResults.business,
      weekly: weeklyResults.business,
      monthly: monthlyResults.business,
    },
  };
}

// pre billing cancellation
async function getPreBillingCancellation() {
  // ChargeBee API configuration
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Calculate period date ranges (same logic as other functions)
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      5,
      0,
      0,
      0,
    ),
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
  const todayEnd = new Date();

  // Fetch cancelled subscriptions from ChargeBee
  const fetchCancelledSubscriptions = async () => {
    const subscriptions = [];
    let offset = null;

    for (let i = 0; i < 10; i++) {
      const params = {
        limit: 100,
        "status[is]": "cancelled",
      };
      if (offset) params.offset = offset;

      const response = await axios.get(
        `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
        {
          auth: { username: CHARGEBEE_API_KEY, password: "" },
          params,
        },
      );

      subscriptions.push(
        ...response.data.list.map((item) => item.subscription),
      );
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }

    return subscriptions;
  };

  // Fetch all subscriptions for ARPU calculation (same as gross revenue controller)
  const fetchAllSubscriptions = async () => {
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

      subscriptions.push(
        ...response.data.list.map((item) => item.subscription),
      );
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }

    return subscriptions;
  };

  // Fetch successful transactions to check for billing history and calculate ARPU
  const fetchTransactions = async () => {
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
  };

  // Get data from ChargeBee
  const [cancelledSubs, allSubscriptions, allTransactions] = await Promise.all([
    fetchCancelledSubscriptions(),
    fetchAllSubscriptions(),
    fetchTransactions(),
  ]);

  // Create map of customers who have made payments
  const customersWithPayments = new Set(
    allTransactions.map((tx) => tx.customer_id),
  );

  // Filter cancelled subscriptions that never had billing (pre-billing cancellations)
  const preBillingCancellations = cancelledSubs.filter((sub) => {
    const hasPayments = customersWithPayments.has(sub.customer_id);
    return !hasPayments;
  });

  // Filter by period based on cancellation date
  const filterByPeriod = (subscriptions, startDate, endDate) => {
    return subscriptions.filter((sub) => {
      const cancelledAt = sub.cancelled_at;
      return (
        cancelledAt >= Math.floor(startDate.getTime() / 1000) &&
        cancelledAt <= Math.floor(endDate.getTime() / 1000)
      );
    });
  };

  // Calculate ARPU using same logic as gross revenue controller (totalNetRevenue / activeClients)
  const calculateARPU = () => {
    // Calculate total net revenue from all transactions
    const totalNetRevenue = allTransactions.reduce(
      (sum, tx) => sum + tx.amount / 100,
      0,
    );

    // Calculate active clients (same logic as gross revenue controller)
    const activeCustomerIds = new Set();
    allSubscriptions.forEach((sub) => {
      if (sub.status === "active") {
        activeCustomerIds.add(sub.customer_id);
      }
    });
    const activeClients = activeCustomerIds.size;

    // Return revenue per client (ARPU)
    return activeClients > 0 ? totalNetRevenue / activeClients : 297; // Default fallback
  };

  const arpu = calculateARPU();

  // Calculate pre-billing cancellations for each period
  const dailyCancellations = filterByPeriod(
    preBillingCancellations,
    todayStart,
    todayEnd,
  );
  const weeklyCancellations = filterByPeriod(
    preBillingCancellations,
    weekStart,
    todayEnd,
  );
  const monthlyCancellations = filterByPeriod(
    preBillingCancellations,
    monthStart,
    todayEnd,
  );

  // Formula: Trials cancelled before billing × ARPU
  return {
    daily: {
      count: dailyCancellations.length,
      amount: dailyCancellations.length * arpu,
    },
    weekly: {
      count: weeklyCancellations.length,
      amount: weeklyCancellations.length * arpu,
    },
    monthly: {
      count: monthlyCancellations.length,
      amount: monthlyCancellations.length * arpu,
    },
    arpu: arpu,
  };
}

// Revenue at Risk (Next 30 Days)
// Calculates monthly revenue that could be lost in next 30 days
// Includes: Failed payments + Trials ending
async function getRevenueAtRisk() {
  // ChargeBee API configuration
  const CHARGEBEE_SITE = "americacreditcare";
  const CHARGEBEE_API_KEY = "live_V4QeV1Vr1Syp27Q973I9KVmdk2Nx0GIo";

  // Calculate time boundaries for risk assessment
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Convert to Unix timestamps for ChargeBee API
  const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const thirtyDaysFromNowTimestamp = Math.floor(
    thirtyDaysFromNow.getTime() / 1000,
  );

  // Fetch recent failed payment transactions (last 30 days)
  const fetchFailedPayments = async () => {
    const transactions = [];
    let offset = null;

    for (let i = 0; i < 10; i++) {
      const params = {
        limit: 100,
        "type[is]": "payment",
        "status[is]": "failure",
        "date[after]": thirtyDaysAgoTimestamp,
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

  // Fetch trial subscriptions ending in next 30 days
  const fetchTrialsEndingSoon = async () => {
    const subscriptions = [];
    let offset = null;

    for (let i = 0; i < 10; i++) {
      const params = {
        limit: 100,
        "status[is]": "in_trial",
      };
      if (offset) params.offset = offset;

      const response = await axios.get(
        `https://${CHARGEBEE_SITE}.chargebee.com/api/v2/subscriptions`,
        {
          auth: { username: CHARGEBEE_API_KEY, password: "" },
          params,
        },
      );

      subscriptions.push(
        ...response.data.list.map((item) => item.subscription),
      );
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }

    // Filter trials ending within next 30 days
    return subscriptions.filter((sub) => {
      return sub.trial_end && sub.trial_end <= thirtyDaysFromNowTimestamp;
    });
  };

  // Fetch all active subscriptions to get MRR for failed payment customers
  const fetchActiveSubscriptions = async () => {
    const subscriptions = [];
    let offset = null;

    for (let i = 0; i < 20; i++) {
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

      subscriptions.push(
        ...response.data.list.map((item) => item.subscription),
      );
      if (!response.data.next_offset) break;
      offset = response.data.next_offset;
    }

    return subscriptions;
  };

  // Get data from ChargeBee APIs
  const [failedPayments, trialsEndingSoon, activeSubscriptions] =
    await Promise.all([
      fetchFailedPayments(),
      fetchTrialsEndingSoon(),
      fetchActiveSubscriptions(),
    ]);

  // DEBUG: Console log trial data
  console.log("=== REVENUE AT RISK DEBUG - TRIALS ===");
  console.log(
    'Total trials found with status "in_trial":',
    trialsEndingSoon.length,
  );
  console.log("30 days from now timestamp:", thirtyDaysFromNowTimestamp);
  console.log("30 days from now date:", thirtyDaysFromNow.toISOString());

  if (trialsEndingSoon.length > 0) {
    console.log("First few trial subscriptions:");
    trialsEndingSoon.slice(0, 3).forEach((trial, index) => {
      console.log(`Trial ${index + 1}:`, {
        id: trial.id,
        customer_id: trial.customer_id,
        status: trial.status,
        current_term_end: trial.trial_end,
        current_term_end_date: trial.trial_end
          ? new Date(trial.trial_end * 1000).toISOString()
          : "N/A",
        trial_end: trial.trial_end,
        trial_end_date: trial.trial_end
          ? new Date(trial.trial_end * 1000).toISOString()
          : "N/A",
      });
    });
  } else {
    console.log('No trials found with status "in_trial"');
  }
  console.log("=== END TRIAL DEBUG ===");

  // Calculate MRR from subscription data
  const getMRRFromSubscription = (subscription) => {
    // Use ChargeBee's calculated MRR if available
    if (subscription.mrr) {
      return subscription.mrr / 100; // Convert from cents to dollars
    }

    // Calculate MRR from subscription items if mrr field not available
    if (subscription.subscription_items) {
      const monthlyAmount = subscription.subscription_items
        .filter((item) => item.item_type === "plan")
        .reduce((sum, item) => sum + item.amount / 100, 0);
      return monthlyAmount;
    }

    return 0;
  };

  // Calculate revenue at risk from failed payments
  // Logic: Customers with recent payment failures might churn if not resolved
  const failedPaymentCustomers = new Set(
    failedPayments.map((tx) => tx.customer_id),
  );
  const failedPaymentMRR = activeSubscriptions
    .filter((sub) => failedPaymentCustomers.has(sub.customer_id))
    .reduce((sum, sub) => sum + getMRRFromSubscription(sub), 0);

  // Calculate revenue at risk from trials ending
  // Logic: Trial customers might not convert to paid subscriptions
  const trialEndingMRR = trialsEndingSoon.reduce(
    (sum, sub) => sum + getMRRFromSubscription(sub),
    0,
  );

  // Total revenue at risk calculation
  const totalRevenueAtRisk = failedPaymentMRR + trialEndingMRR;
  const totalCustomersAtRisk =
    failedPaymentCustomers.size + trialsEndingSoon.length;

  // Return revenue at risk data (not affected by daily/weekly/monthly filters)
  return {
    amount: totalRevenueAtRisk,
    count: totalCustomersAtRisk,
    breakdown: {
      failedPayments: {
        count: failedPaymentCustomers.size,
        mrr: failedPaymentMRR,
      },
      trialsEnding: {
        count: trialsEndingSoon.length,
        mrr: trialEndingMRR,
      },
    },
  };
}

// Main controller function
const getFunnelSnapshot = async (req, res) => {
  try {
    const { dateFilter, selectedDate, startDate, endDate } = req.query;

    // --- Filtered mode: single date range ---
    if (dateFilter) {
      const range = getFunnelDateRange(dateFilter, selectedDate, startDate, endDate);

      const [
        leadsData,
        bookedData,
        showedData,
        enrolledPaidData,
        mishapsData,
        preBillingData,
        revenueAtRiskData,
      ] = await Promise.all([
        getLeadsFiltered(range),
        getBookedFiltered(range),
        getShowedFiltered(range),
        getEnrolledAndPaidFiltered(range),
        getMishapsFiltered(range),
        getPreBillingCancellationFiltered(range),
        getRevenueAtRisk(),
      ]);

      const enrolled = enrolledPaidData.enrolled.count;
      const paid     = enrolledPaidData.paid.count;
      const avgEnrollmentValue = enrolled > 0 ? enrolledPaidData.enrolled.revenue / enrolled : 0;

      const metrics = {
        personal: {
          showRate:       bookedData.personal > 0 ? (showedData.personal / bookedData.personal) * 100 : 0,
          closeRate:      showedData.personal > 0 ? (enrolled / showedData.personal) * 100 : 0,
          noShowCost:     mishapsData.personal.count * avgEnrollmentValue,
          paidConversion: enrolled > 0 ? (paid / enrolled) * 100 : 0,
        },
        business: {
          showRate:       bookedData.business > 0 ? (showedData.business / bookedData.business) * 100 : 0,
          closeRate:      showedData.business > 0 ? (enrolled / showedData.business) * 100 : 0,
          noShowCost:     mishapsData.business.count * avgEnrollmentValue,
          paidConversion: enrolled > 0 ? (paid / enrolled) * 100 : 0,
        },
      };

      return res.json({
        custom: {
          leads:                  leadsData.count,
          booked:                 bookedData,
          showed:                 showedData,
          mishaps:                mishapsData,
          preBillingCancellations: preBillingData,
          revenueAtRisk:          revenueAtRiskData,
          enrolled:               enrolledPaidData.enrolled,
          paid:                   enrolledPaidData.paid,
          metrics,
        },
      });
    }

    // --- Legacy mode: daily / weekly / monthly ---
    const [
      leadsData,
      bookedData,
      showedData,
      enrolledPaidData,
      mishapsData,
      preBillingData,
      revenueAtRiskData,
    ] = await Promise.all([
      getLeads(),
      getBookedAppointments(),
      getShowedAppointments(),
      getEnrolledAndPaid(),
      getMishaps(),
      getPreBillingCancellation(),
      getRevenueAtRisk(),
    ]);

    // Calculate metrics for each period
    const calculateMetrics = (period) => {
      const enrolled = enrolledPaidData[period].enrolled.count;
      const paid = enrolledPaidData[period].paid.count;
      const avgEnrollmentValue =
        enrolled > 0 ? enrolledPaidData[period].enrolled.revenue / enrolled : 0;

      // Get no-show counts from mishaps data
      const personalNoShows = mishapsData.personal[period].count;
      const businessNoShows = mishapsData.business[period].count;

      return {
        personal: {
          showRate:
            bookedData.personal[period] > 0
              ? (showedData.personal[period] / bookedData.personal[period]) *
                100
              : 0,
          closeRate:
            showedData.personal[period] > 0
              ? (enrolled / showedData.personal[period]) * 100
              : 0,
          noShowCost: personalNoShows * avgEnrollmentValue,
          paidConversion: enrolled > 0 ? (paid / enrolled) * 100 : 0,
        },
        business: {
          showRate:
            bookedData.business[period] > 0
              ? (showedData.business[period] / bookedData.business[period]) *
                100
              : 0,
          closeRate:
            showedData.business[period] > 0
              ? (enrolled / showedData.business[period]) * 100
              : 0,
          noShowCost: businessNoShows * avgEnrollmentValue,
          paidConversion: enrolled > 0 ? (paid / enrolled) * 100 : 0,
        },
      };
    };

    res.json({
      leads: leadsData,
      booked: bookedData,
      showed: showedData,
      mishaps: mishapsData,
      preBillingCancellations: preBillingData,
      revenueAtRisk: revenueAtRiskData,
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
      metrics: {
        daily: calculateMetrics("daily"),
        weekly: calculateMetrics("weekly"),
        monthly: calculateMetrics("monthly"),
      },
    });
  } catch (error) {
    console.error("Funnel Snapshot API Error:", error);
    res.status(500).json({ error: "Failed to fetch funnel snapshot data" });
  }
};

module.exports = { getFunnelSnapshot };
