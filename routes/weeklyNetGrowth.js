const express = require("express");
const router = express.Router();
const { getWeeklyNetGrowth } = require("../controllers/weeklyNetGrowthController");

router.get("/", getWeeklyNetGrowth);

module.exports = router;
