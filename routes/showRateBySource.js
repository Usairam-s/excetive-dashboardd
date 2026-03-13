const express = require("express");
const router = express.Router();
const { getShowRateBySource } = require("../controllers/showRateBySourceController");

router.get("/", getShowRateBySource);

module.exports = router;
