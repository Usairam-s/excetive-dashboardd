const express = require("express");
const router = express.Router();
const { getMonthlyChurnRate } = require("../controllers/monthlyChurnRateController");

router.get("/", getMonthlyChurnRate);

module.exports = router;
