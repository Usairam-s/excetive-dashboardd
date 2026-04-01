const express = require("express");
const router = express.Router();
const { getCalendarEvents } = require("../controllers/calendarEventsController");

router.get("/", getCalendarEvents);

module.exports = router;
