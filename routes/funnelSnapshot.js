const express = require("express");
const {
  getFunnelSnapshot,
} = require("../controllers/funnelSnapshotController");

const router = express.Router();

router.get("/", getFunnelSnapshot);

module.exports = router;
