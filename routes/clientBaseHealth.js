const express = require("express");
const {
  getClientBaseHealth,
} = require("../controllers/clientBaseHealthController");

const router = express.Router();

router.get("/", getClientBaseHealth);

module.exports = router;
