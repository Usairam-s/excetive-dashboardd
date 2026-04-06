const express = require("express");
const router = express.Router();
const {
  getFunnelSnapshotChargebee,
} = require("../controllers/funnelSnapshotChargebeeController");

router.get("/", getFunnelSnapshotChargebee);

module.exports = router;
