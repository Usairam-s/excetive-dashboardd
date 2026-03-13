const express = require("express");
const router = express.Router();
const { getEffectiveLifetime } = require("../controllers/effectiveLifetimeController");

router.get("/", getEffectiveLifetime);

module.exports = router;
