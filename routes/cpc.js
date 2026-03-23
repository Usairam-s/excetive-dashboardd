const express = require("express");
const { getCpc } = require("../controllers/cpcController");

const router = express.Router();

router.get("/", getCpc);

module.exports = router;
