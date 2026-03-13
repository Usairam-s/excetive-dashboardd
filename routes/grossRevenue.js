const express = require("express");
const { getGrossRevenue } = require("../controllers/grossRevenueController");

const router = express.Router();

router.get("/", getGrossRevenue);

module.exports = router;