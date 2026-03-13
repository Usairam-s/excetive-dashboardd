const express = require("express");
const { getAlerts } = require("../controllers/alertsController");

const router = express.Router();

router.get("/", getAlerts);

module.exports = router;
