const express = require("express");
const { getFormSubmissionsFunnel } = require("../controllers/formSubmissionsFunnelController");

const router = express.Router();

router.get("/", getFormSubmissionsFunnel);

module.exports = router;