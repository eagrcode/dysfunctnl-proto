const { param, validationResult } = require("express-validator");
const { ValidationError } = require("../../_shared/utils/errors");
const customConsoleLog = require("../utils/customConsoleLog");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const validateUUIDParams = (req, res, next) => {
  const errors = [];

  customConsoleLog("Validating UUID params", Object.entries(req.params));

  for (const [key, value] of Object.entries(req.params)) {
    if (key.toLowerCase().endsWith("id")) {
      if (value !== NIL_UUID && !UUID_REGEX.test(value)) {
        customConsoleLog(`Invalid UUID for param`, { key, value });
        errors.push({ param: key, value, msg: `${key} must be a valid UUID` });
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Invalid UUID parameter(s)", errors);
  }

  next();
};

module.exports = validateUUIDParams;
