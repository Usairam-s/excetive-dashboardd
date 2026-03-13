const express = require("express");
const router = express.Router();
const { getCohortRetention } = require("../controllers/cohortRetentionController");

router.get("/", getCohortRetention);

module.exports = router;
