const express = require("express");
const router = express.Router();
const {
  getFunnelSnapshotGhl,
} = require("../controllers/funnelSnapshotGhlController");

router.get("/", getFunnelSnapshotGhl);

module.exports = router;
