const axios = require("axios");

async function getCalendarEvents(req, res) {
  try {
    const { calendarId, dateFilter, fromDate, toDate } = req.query;

    if (!calendarId) {
      return res.status(400).json({ error: "calendarId is required" });
    }

    // Fetch events from LeadConnector API
    const response = await axios.get(
      `https://services.leadconnectorhq.com/calendars/events`,
      {
        params: {
          locationId: "bPdsUgmB6j1uqMsb9EXG",
          calendarId: calendarId,
          startTime: 0,
          endTime: 4102444800000,
        },
        headers: {
          Accept: "application/json",
          Version: "2021-04-15",
          Authorization: "Bearer pit-1fe97cf8-b87c-4699-b2ae-76ca868c39d5",
        },
      }
    );

    let events = response.data.events || [];
    const totalApiResults = events.length;

    // Filter by date if not "all" - using UTC to match GHL behavior
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      const todayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);

      events = events.filter((event) => {
        const dateAdded = new Date(event.dateAdded);
        const dateAddedUTC = new Date(
          Date.UTC(
            dateAdded.getUTCFullYear(),
            dateAdded.getUTCMonth(),
            dateAdded.getUTCDate()
          )
        );

        if (dateFilter === "today") {
          return dateAddedUTC.getTime() === todayUTC.getTime();
        } else if (dateFilter === "yesterday") {
          return dateAddedUTC.getTime() === yesterdayUTC.getTime();
        } else if (dateFilter === "custom") {
          if (!fromDate || !toDate) {
            return true;
          }

          const fromDateUTC = new Date(fromDate + "T00:00:00Z");
          const toDateUTC = new Date(toDate + "T23:59:59Z");

          return dateAdded >= fromDateUTC && dateAdded <= toDateUTC;
        }
        return true;
      });
    }

    // Count events by status
    const statusCounts = {
      confirmed: 0,
      showed: 0,
      noshow: 0,
      cancelled: 0,
      rescheduled: 0,
    };

    events.forEach((event) => {
      const status = event.appointmentStatus;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    res.json({
      totalApiResults,
      totalFiltered: events.length,
      statusCounts,
      events: events.slice(0, 50), // Return first 50 events for details
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getCalendarEvents };
