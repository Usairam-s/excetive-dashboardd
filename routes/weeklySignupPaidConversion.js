const express = require("express");
const router = express.Router();
const { getWeeklySignupPaidConversion } = require("../controllers/weeklySignupPaidConversionController");

router.get("/", getWeeklySignupPaidConversion);

module.exports = router;
