const express = require("express");
const router = express.Router();
const { getMonthlyRetention } = require("../controllers/monthlyRetentionController");

router.get("/", getMonthlyRetention);

module.exports = router;
