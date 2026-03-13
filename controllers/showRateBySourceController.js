const axios = require("axios");

const LOCATION_ID = "bPdsUgmB6j1uqMsb9EXG";
const TOKEN = "pit-edfb0220-19c9-4d80-a7b1-f7121bb6d650";
const API_URL = "https://services.leadconnectorhq.com/contacts/search";

async function fetchAllContactsWithTag(tag) {
  const contacts = [];
  let searchAfter = null;
  let hasMore = true;

  while (hasMore) {
    const requestBody = {
      locationId: LOCATION_ID,
      pageLimit: 100,
      filters: [
        {
          field: "tags",
          operator: "eq",
          value: tag,
        },
      ],
    };

    if (searchAfter) {
      requestBody.searchAfter = searchAfter;
    } else {
      requestBody.page = 1;
    }

    const response = await axios.post(API_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
    });

    contacts.push(...response.data.contacts);

    if (response.data.contacts.length < 100) {
      hasMore = false;
    } else {
      const lastContact =
        response.data.contacts[response.data.contacts.length - 1];
      searchAfter = lastContact.searchAfter;
    }
  }

  return contacts;
}

const getShowRateBySource = async (req, res) => {
  try {
    const [
      bookedPersonal,
      bookedBusiness,
      showedPersonal,
      showedBusiness,
      noShowPersonal,
      noShowBusiness,
      cancelledPersonal,
      cancelledBusiness,
      invalidPersonal,
      invalidBusiness,
      manuallyScheduled,
    ] = await Promise.all([
      fetchAllContactsWithTag("confirmed_appointment_status_personal"),
      fetchAllContactsWithTag("confirmed_appointment_status_business"),
      fetchAllContactsWithTag("showed_appointment_status_personal"),
      fetchAllContactsWithTag("showed_appointment_status_business"),
      fetchAllContactsWithTag("no_show_appointment_status_personal"),
      fetchAllContactsWithTag("no_show_appointment_status_business"),
      fetchAllContactsWithTag("cancelled_appointment_status_personal"),
      fetchAllContactsWithTag("cancelled_appointment_status_business"),
      fetchAllContactsWithTag("invalid_appointment_status_personal"),
      fetchAllContactsWithTag("invalid_appointment_status_business"),
      fetchAllContactsWithTag("manually_scheduled"),
    ]);

    // Remove duplicates by contact ID
    const uniqueBooked = new Map();
    [...bookedPersonal, ...bookedBusiness].forEach((contact) => {
      uniqueBooked.set(contact.id, contact);
    });
    const bookedContacts = Array.from(uniqueBooked.values());

    const uniqueShowed = new Map();
    [...showedPersonal, ...showedBusiness].forEach((contact) => {
      uniqueShowed.set(contact.id, contact);
    });
    const showedContacts = Array.from(uniqueShowed.values());

    // Combine all mishap contacts (no show + cancelled + invalid)
    const uniqueMishaps = new Map();
    [
      ...noShowPersonal,
      ...noShowBusiness,
      ...cancelledPersonal,
      ...cancelledBusiness,
      ...invalidPersonal,
      ...invalidBusiness,
    ].forEach((contact) => {
      uniqueMishaps.set(contact.id, contact);
    });
    const mishapContacts = Array.from(uniqueMishaps.values());

    // Process manual bookings - contacts with manually_scheduled AND confirmed tags
    const manualBookedContacts = manuallyScheduled.filter(contact => 
      contact.tags?.includes("confirmed_appointment_status_personal") ||
      contact.tags?.includes("confirmed_appointment_status_business")
    );
    
    const manualShowedContacts = manualBookedContacts.filter(contact =>
      contact.tags?.includes("showed_appointment_status_personal") ||
      contact.tags?.includes("showed_appointment_status_business")
    );
    
    const manualMishapContacts = manualBookedContacts.filter(contact =>
      contact.tags?.includes("no_show_appointment_status_personal") ||
      contact.tags?.includes("no_show_appointment_status_business") ||
      contact.tags?.includes("cancelled_appointment_status_personal") ||
      contact.tags?.includes("cancelled_appointment_status_business") ||
      contact.tags?.includes("invalid_appointment_status_personal") ||
      contact.tags?.includes("invalid_appointment_status_business")
    );

    const manualBooking = {
      medium: "Manual Booking",
      booked: manualBookedContacts.length,
      showed: manualShowedContacts.length,
      mishaps: manualMishapContacts.length,
      showRate: manualBookedContacts.length > 0 ? 
        Math.round((manualShowedContacts.length / manualBookedContacts.length) * 1000) / 10 : 0
    };

    const sourceStats = {};

    bookedContacts.forEach((contact) => {
      const medium = contact.attributionSource?.medium || "unknown";
      if (!sourceStats[medium]) {
        sourceStats[medium] = { booked: 0, showed: 0, mishaps: 0 };
      }
      sourceStats[medium].booked++;
    });

    showedContacts.forEach((contact) => {
      const medium = contact.attributionSource?.medium || "unknown";
      if (!sourceStats[medium]) {
        sourceStats[medium] = { booked: 0, showed: 0, mishaps: 0 };
      }
      sourceStats[medium].showed++;
    });

    mishapContacts.forEach((contact) => {
      const medium = contact.attributionSource?.medium || "unknown";
      if (!sourceStats[medium]) {
        sourceStats[medium] = { booked: 0, showed: 0, mishaps: 0 };
      }
      sourceStats[medium].mishaps++;
    });

    const showRateBySource = Object.keys(sourceStats).map((medium) => {
      const { booked, showed, mishaps } = sourceStats[medium];
      const showRate = booked > 0 ? (showed / booked) * 100 : 0;
      return {
        medium,
        booked,
        showed,
        mishaps,
        showRate: Math.round(showRate * 10) / 10,
      };
    });

    showRateBySource.sort((a, b) => b.booked - a.booked);

    res.json({
      manualBooking,
      showRateBySource,
      summary: {
        totalBooked: bookedContacts.length,
        totalShowed: showedContacts.length,
        totalMishaps: mishapContacts.length,
        overallShowRate:
          bookedContacts.length > 0
            ? Math.round(
                (showedContacts.length / bookedContacts.length) * 1000,
              ) / 10
            : 0,
      },
    });
  } catch (error) {
    console.error("Show Rate By Source Error:", error);
    res.status(500).json({ error: "Failed to fetch show rate by source data" });
  }
};

module.exports = { getShowRateBySource };
