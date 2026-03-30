const axios = require("axios");

const LOCATION_ID = "bPdsUgmB6j1uqMsb9EXG";
const TOKEN = "pit-1fe97cf8-b87c-4699-b2ae-76ca868c39d5";
const FORMS_API = "https://services.leadconnectorhq.com/forms/";
const SUBMISSIONS_API = "https://services.leadconnectorhq.com/forms/submissions";
const SEARCH_API = "https://services.leadconnectorhq.com/contacts/search";

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

    const response = await axios.post(SEARCH_API, requestBody, {
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

async function fetchAllSubmissions() {
  let allSubmissions = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get(
      `${SUBMISSIONS_API}?locationId=${LOCATION_ID}&limit=100&page=${page}`,
      {
        headers: {
          Accept: "application/json",
          Version: "2021-07-28",
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    const data = response.data;
    allSubmissions = allSubmissions.concat(data.submissions || []);
    hasMore = data.meta && data.meta.nextPage;
    page++;
  }

  return allSubmissions;
}

async function fetchAllForms() {
  let allForms = [];
  let skip = 0;
  let total = 0;

  do {
    const response = await axios.get(
      `${FORMS_API}?locationId=${LOCATION_ID}&limit=20&skip=${skip}`,
      {
        headers: {
          Accept: "application/json",
          Version: "2021-07-28",
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );
    const data = response.data;
    total = data.total;
    allForms = allForms.concat(data.forms);
    skip += 20;
  } while (allForms.length < total);

  return allForms;
}

const getFormSubmissionsFunnel = async (req, res) => {
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
      allSubmissions,
      allForms,
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
      fetchAllSubmissions(),
      fetchAllForms(),
    ]);

    // Filter to target forms only
    const TARGET_FORM_NAMES = [
      "Qualifying Questions/Get Credit Reports",
      "Form to gather lead info before booking", 
      "New Lead Schedule Form",
      "New Lead Schedule Form - Credit Report",
    ];
    const filteredForms = allForms.filter((f) =>
      TARGET_FORM_NAMES.includes(f.name)
    );

    // Create contact status map with data fix
    const contactMap = new Map();
    
    // Handle booked contacts
    bookedPersonal.forEach((c) => contactMap.set(c.id, "booked_personal"));
    bookedBusiness.forEach((c) => contactMap.set(c.id, "booked_business"));
    
    // Handle showed contacts - if they showed but weren't booked, count them as booked too
    showedPersonal.forEach((c) => {
      if (!contactMap.has(c.id)) {
        contactMap.set(c.id, "booked_personal"); // Auto-count as booked if they showed
      }
      contactMap.set(c.id, "showed_personal");
    });
    showedBusiness.forEach((c) => {
      if (!contactMap.has(c.id)) {
        contactMap.set(c.id, "booked_business"); // Auto-count as booked if they showed
      }
      contactMap.set(c.id, "showed_business");
    });

    // Handle mishaps
    [
      ...noShowPersonal,
      ...noShowBusiness,
      ...cancelledPersonal,
      ...cancelledBusiness,
      ...invalidPersonal,
      ...invalidBusiness,
    ].forEach((contact) => {
      const currentStatus = contactMap.get(contact.id);
      if (currentStatus === "booked_personal" || currentStatus === "showed_personal") {
        contactMap.set(contact.id, "mishap_personal");
      } else if (currentStatus === "booked_business" || currentStatus === "showed_business") {
        contactMap.set(contact.id, "mishap_business");
      }
    });

    // Process each form
    const formSubmissionsBySource = [];
    let totalSubmissions = 0;
    let totalBookedPersonal = 0;
    let totalBookedBusiness = 0;
    let totalShowedPersonal = 0;
    let totalShowedBusiness = 0;
    let totalMishapsPersonal = 0;
    let totalMishapsBusiness = 0;

    filteredForms.forEach((form) => {
      const formSubmissions = allSubmissions.filter((s) => s.formId === form.id);
      totalSubmissions += formSubmissions.length;

      const stats = {
        booked_personal: 0,
        booked_business: 0,
        showed_personal: 0,
        showed_business: 0,
        mishap_personal: 0,
        mishap_business: 0,
      };

      formSubmissions.forEach((submission) => {
        const category = contactMap.get(submission.contactId);
        if (category) stats[category]++;
      });

      // Calculate rates
      const totalBooked = stats.booked_personal + stats.booked_business;
      const totalShowed = stats.showed_personal + stats.showed_business;
      const totalMishaps = stats.mishap_personal + stats.mishap_business;

      const showRate = totalBooked > 0 ? 
        Math.round((totalShowed / totalBooked) * 1000) / 10 : 0;
      const noShowRate = totalBooked > 0 ? 
        Math.round((totalMishaps / totalBooked) * 1000) / 10 : 0;

      formSubmissionsBySource.push({
        formName: form.name,
        submissions: formSubmissions.length,
        bookedPersonal: stats.booked_personal,
        bookedBusiness: stats.booked_business,
        showedPersonal: stats.showed_personal,
        showedBusiness: stats.showed_business,
        showRate,
        mishapsPersonal: stats.mishap_personal,
        mishapsBusiness: stats.mishap_business,
        noShowRate,
      });

      // Add to totals
      totalBookedPersonal += stats.booked_personal;
      totalBookedBusiness += stats.booked_business;
      totalShowedPersonal += stats.showed_personal;
      totalShowedBusiness += stats.showed_business;
      totalMishapsPersonal += stats.mishap_personal;
      totalMishapsBusiness += stats.mishap_business;
    });

    // Calculate overall rates
    const overallTotalBooked = totalBookedPersonal + totalBookedBusiness;
    const overallTotalShowed = totalShowedPersonal + totalShowedBusiness;
    const overallTotalMishaps = totalMishapsPersonal + totalMishapsBusiness;

    const overallShowRate = overallTotalBooked > 0 ? 
      Math.round((overallTotalShowed / overallTotalBooked) * 1000) / 10 : 0;
    const overallNoShowRate = overallTotalBooked > 0 ? 
      Math.round((overallTotalMishaps / overallTotalBooked) * 1000) / 10 : 0;

    res.json({
      summary: {
        totalSubmissions,
        totalBookedPersonal,
        totalBookedBusiness,
        totalShowedPersonal,
        totalShowedBusiness,
        totalMishapsPersonal,
        totalMishapsBusiness,
        overallShowRate,
        overallNoShowRate,
      },
      formSubmissionsBySource,
    });

  } catch (error) {
    console.error("Form Submissions Funnel Error:", error);
    res.status(500).json({ error: "Failed to fetch form submissions funnel data" });
  }
};

module.exports = { getFormSubmissionsFunnel };