const axios = require("axios");

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

// GHL config
const GHL_LOCATION_ID = "bPdsUgmB6j1uqMsb9EXG";
const GHL_TOKEN = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
const GHL_API_URL = "https://services.leadconnectorhq.com/contacts/search";

// Filtered: Get total leads
async function getLeadsFiltered(range) {
  const response = await axios.post(
    GHL_API_URL,
    {
      locationId: GHL_LOCATION_ID,
      page: 1,
      pageLimit: 500,
      filters: [
        {
          group: "AND",
          filters: [
            { field: "tags", operator: "eq", value: "new lead" },
            { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
          ],
        },
      ],
    },
    { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: "2021-07-28", "Content-Type": "application/json" } },
  );
  return { count: response.data.contacts.length };
}

// Filtered: Get showed appointments (for close rate denominator)
async function getShowedFiltered(range) {
  const makeQuery = (tag) =>
    axios.post(
      GHL_API_URL,
      {
        locationId: GHL_LOCATION_ID,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              { field: "tags", operator: "eq", value: tag },
              { field: "dateAdded", operator: "range", value: { gte: range.startISO, lte: range.endISO } },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: "2021-07-28", "Content-Type": "application/json" } },
    );

  const [personal, business] = await Promise.all([
    makeQuery("showed_appointment_status_personal"),
    makeQuery("showed_appointment_status_business"),
  ]);

  return {
    personal: personal.data.contacts.length,
    business: business.data.contacts.length,
  };
}

// Legacy: Get leads for daily/weekly/monthly
async function getLeadsLegacy() {
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

  const makeQuery = (start, end) =>
    axios.post(
      GHL_API_URL,
      {
        locationId: GHL_LOCATION_ID,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              { field: "tags", operator: "eq", value: "new lead" },
              { field: "dateAdded", operator: "range", value: { gte: start.toISOString(), lte: end.toISOString() } },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: "2021-07-28", "Content-Type": "application/json" } },
    );

  const [dailyContacts, weeklyContacts, monthlyContacts] = await Promise.all([
    makeQuery(todayStart, todayEnd),
    makeQuery(weekStart, todayEnd),
    makeQuery(monthStart, todayEnd),
  ]);

  return {
    daily: dailyContacts.data.contacts.length,
    weekly: weeklyContacts.data.contacts.length,
    monthly: monthlyContacts.data.contacts.length,
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

  const makeQuery = (tag, start, end) =>
    axios.post(
      GHL_API_URL,
      {
        locationId: GHL_LOCATION_ID,
        page: 1,
        pageLimit: 500,
        filters: [
          {
            group: "AND",
            filters: [
              { field: "tags", operator: "eq", value: tag },
              { field: "dateAdded", operator: "range", value: { gte: start.toISOString(), lte: end.toISOString() } },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: "2021-07-28", "Content-Type": "application/json" } },
    );

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
      daily: personalDaily.data.contacts.length,
      weekly: personalWeekly.data.contacts.length,
      monthly: personalMonthly.data.contacts.length,
    },
    business: {
      daily: businessDaily.data.contacts.length,
      weekly: businessWeekly.data.contacts.length,
      monthly: businessMonthly.data.contacts.length,
    },
  };
}

// Main handler
const getFunnelSnapshotGhl = async (req, res) => {
  try {
    const { dateFilter, selectedDate, startDate, endDate } = req.query;

    // Filtered mode
    if (dateFilter) {
      const range = getGhlDateRange(dateFilter, selectedDate, startDate, endDate);
      const [leadsData, showedData] = await Promise.all([
        getLeadsFiltered(range),
        getShowedFiltered(range),
      ]);

      return res.json({
        custom: {
          leads: leadsData.count,
          showed: showedData,
        },
      });
    }

    // Legacy mode
    const [leadsData, showedData] = await Promise.all([
      getLeadsLegacy(),
      getShowedLegacy(),
    ]);

    res.json({
      leads: leadsData,
      showed: showedData,
    });
  } catch (error) {
    console.error("Funnel Snapshot GHL API Error:", error);
    res.status(500).json({ error: "Failed to fetch GHL funnel data" });
  }
};

module.exports = { getFunnelSnapshotGhl };
