const axios = require("axios");

// Helper function to paginate through GHL contacts search API
async function fetchAllContactsPaginated(locationId, token, filters) {
  const apiUrl = "https://services.leadconnectorhq.com/contacts/search";
  const allContacts = [];
  let currentPage = 1;
  let totalFetched = 0;
  let total = 0;

  console.log(`[GHL PAGINATION START] Fetching contacts with filters:`, JSON.stringify(filters, null, 2));

  do {
    console.log(`[GHL PAGINATION] Requesting page ${currentPage}, pageLimit: 500`);
    
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

    console.log(`[GHL PAGINATION] Page ${currentPage} received: ${contacts.length} contacts`);
    console.log(`[GHL PAGINATION] Total reported by API: ${total}, Total fetched so far: ${totalFetched}`);

    // Break if we've fetched all contacts or if there are no more results
    if (totalFetched >= total || contacts.length === 0) {
      console.log(`[GHL PAGINATION END] Stopping. Total fetched: ${totalFetched}, Total available: ${total}`);
      break;
    }

    // Check if we're approaching the 10,000 record limit (standard pagination limit)
    if (totalFetched >= 10000) {
      console.warn(`Warning: Reached 10,000 contact limit for pagination. Consider implementing cursor-based pagination.`);
      break;
    }

    currentPage++;
  } while (true);

  console.log(`[GHL PAGINATION COMPLETE] Returning ${allContacts.length} contacts`);
  return allContacts;
}

// Helper: compute date range from dateFilter params (reused from main controller)
function getGhlDateRange(dateFilter, selectedDate, startDate, endDate) {
  const now = new Date();

  if (dateFilter === "range" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd, 5, 0, 0, 0);
    const endMs   = Date.UTC(ey, em - 1, ed + 1, 4, 59, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
    };
  }

  if (dateFilter === "custom" && selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const startMs = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    const endMs   = Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
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
  else startMs = todayStart.getTime();

  const endMs = Date.now();
  return {
    startISO: new Date(startMs).toISOString(),
    endISO:   new Date(endMs).toISOString(),
  };
}

// Helper: compute date range for new leads ONLY using EDT timezone (4:15 UTC offset)
function getGhlDateRangeForLeads(dateFilter, selectedDate, startDate, endDate) {
  const now = new Date();

  if (dateFilter === "range" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    // EDT: using 4:15 AM UTC as midnight EDT
    const startMs = Date.UTC(sy, sm - 1, sd, 4, 15, 0, 0);
    const endMs   = Date.UTC(ey, em - 1, ed + 1, 4, 14, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
    };
  }

  if (dateFilter === "custom" && selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    // EDT: using 4:15 AM UTC as midnight EDT
    const startMs = Date.UTC(y, m - 1, d, 4, 15, 0, 0);
    const endMs   = Date.UTC(y, m - 1, d + 1, 4, 14, 59, 999);
    return {
      startISO: new Date(startMs).toISOString(),
      endISO:   new Date(endMs).toISOString(),
    };
  }

  // Presets: today, this_week, this_month using EDT (4:15 AM UTC)
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 15, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday, 4, 15, 0, 0),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 4, 15, 0, 0),
  );

  let startMs;
  if (dateFilter === "this_week") startMs = weekStart.getTime();
  else if (dateFilter === "this_month") startMs = monthStart.getTime();
  else startMs = todayStart.getTime();

  const endMs = Date.now();
  return {
    startISO: new Date(startMs).toISOString(),
    endISO:   new Date(endMs).toISOString(),
  };
}

// GHL config
const GHL_LOCATION_ID = "bPdsUgmB6j1uqMsb9EXG";
const GHL_TOKEN = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
const GHL_API_URL = "https://services.leadconnectorhq.com/contacts/search";

// Filtered: Get total leads
async function getLeadsFiltered(range) {
  const filters = [
    {
      group: "AND",
      filters: [
        { field: "tags", operator: "eq", value: "new lead" },
        { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
      ],
    },
  ];

  const contacts = await fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
  return { count: contacts.length };
}

// Filtered: Get booked appointments
async function getBookedFiltered(range) {
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
    return fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
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

// Filtered: Get showed appointments (for close rate denominator)
async function getShowedFiltered(range) {
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
    return fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
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

// Legacy: Get leads for daily/weekly/monthly (using EDT timezone: 4:15 AM UTC)
async function getLeadsLegacy() {
  const now = new Date();
  // EDT: using 4:15 AM UTC as midnight EDT for new leads
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 15, 0, 0),
  );
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday, 4, 15, 0, 0),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 4, 15, 0, 0),
  );
  const todayEnd = new Date();

  const makeQuery = (start, end) => {
    const filters = [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "eq", value: "new lead" },
          { field: "dateAdded", operator: "range", value: { gte: start.toISOString(), lte: end.toISOString() } },
        ],
      },
    ];
    return fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
  };

  const [dailyContacts, weeklyContacts, monthlyContacts] = await Promise.all([
    makeQuery(todayStart, todayEnd),
    makeQuery(weekStart, todayEnd),
    makeQuery(monthStart, todayEnd),
  ]);

  return {
    daily: dailyContacts.length,
    weekly: weeklyContacts.length,
    monthly: monthlyContacts.length,
  };
}

// Legacy: Get booked appointments for daily/weekly/monthly
async function getBookedLegacy() {
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

  const makeQuery = (tag, start, end) => {
    const filters = [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "eq", value: tag },
          { field: "dateAdded", operator: "range", value: { gte: start.toISOString(), lte: end.toISOString() } },
        ],
      },
    ];
    return fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
  };

  const [
    personalDaily, personalWeekly, personalMonthly,
    businessDaily, businessWeekly, businessMonthly,
  ] = await Promise.all([
    makeQuery("confirmed_appointment_status_personal", todayStart, todayEnd),
    makeQuery("confirmed_appointment_status_personal", weekStart, todayEnd),
    makeQuery("confirmed_appointment_status_personal", monthStart, todayEnd),
    makeQuery("confirmed_appointment_status_business", todayStart, todayEnd),
    makeQuery("confirmed_appointment_status_business", weekStart, todayEnd),
    makeQuery("confirmed_appointment_status_business", monthStart, todayEnd),
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

// Legacy: Get showed for daily/weekly/monthly
async function getShowedLegacy() {
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

  const makeQuery = (tag, start, end) => {
    const filters = [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "eq", value: tag },
          { field: "dateAdded", operator: "range", value: { gte: start.toISOString(), lte: end.toISOString() } },
        ],
      },
    ];
    return fetchAllContactsPaginated(GHL_LOCATION_ID, GHL_TOKEN, filters);
  };

  const [
    personalDaily, personalWeekly, personalMonthly,
    businessDaily, businessWeekly, businessMonthly,
  ] = await Promise.all([
    makeQuery("showed_appointment_status_personal", todayStart, todayEnd),
    makeQuery("showed_appointment_status_personal", weekStart, todayEnd),
    makeQuery("showed_appointment_status_personal", monthStart, todayEnd),
    makeQuery("showed_appointment_status_business", todayStart, todayEnd),
    makeQuery("showed_appointment_status_business", weekStart, todayEnd),
    makeQuery("showed_appointment_status_business", monthStart, todayEnd),
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

// Main handler
const getFunnelSnapshotGhl = async (req, res) => {
  try {
    const { dateFilter, selectedDate, startDate, endDate } = req.query;

    // Filtered mode
    if (dateFilter) {
      // Use EDT timezone (4:15 UTC) for new leads only
      const leadsRange = getGhlDateRangeForLeads(dateFilter, selectedDate, startDate, endDate);
      // Use standard timezone (5:00 UTC) for showed and booked appointments
      const appointmentRange = getGhlDateRange(dateFilter, selectedDate, startDate, endDate);
      const [leadsData, bookedData, showedData] = await Promise.all([
        getLeadsFiltered(leadsRange),
        getBookedFiltered(appointmentRange),
        getShowedFiltered(appointmentRange),
      ]);

      return res.json({
        custom: {
          leads: leadsData.count,
          booked: bookedData,
          showed: showedData,
        },
      });
    }

    // Legacy mode
    const [leadsData, bookedData, showedData] = await Promise.all([
      getLeadsLegacy(),
      getBookedLegacy(),
      getShowedLegacy(),
    ]);

    res.json({
      leads: leadsData,
      booked: bookedData,
      showed: showedData,
    });
  } catch (error) {
    console.error("Funnel Snapshot GHL API Error:", error);
    res.status(500).json({ error: "Failed to fetch GHL funnel data" });
  }
};

module.exports = { getFunnelSnapshotGhl };
