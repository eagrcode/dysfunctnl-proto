const { randomUUID } = require("node:crypto");
const { logger } = require("../../lib/logger");

const requestLogger = (req, res, next) => {
  const start = process.hrtime();
  const method = req.method;
  const path = req.originalUrl.split("?")[0];
  const requestId = randomUUID();
  let outcomeLogged = false;

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  logger.debug("Incoming request", { method, path, requestId });

  const logOutcome = (aborted = false) => {
    if (outcomeLogged) return;
    outcomeLogged = true;

    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = Number((seconds * 1000 + nanoseconds / 1e6).toFixed(2));
    const statusCode = aborted && !res.headersSent ? null : res.statusCode;

    // Copy only diagnostic fields supplied by handlers, never whole response bodies.
    const requestError = res.locals.requestError;
    const logData = {
      method,
      path,
      requestId,
      statusCode,
      durationMs,
      ...(typeof requestError?.code === "string" && { code: requestError.code }),
      ...(typeof requestError?.message === "string" && { reason: requestError.message }),
      ...(Array.isArray(requestError?.errors) && {
        errors: requestError.errors.map(({ field, message }) => ({ field, message })),
      }),
      ...(typeof requestError?.name === "string" && { errorName: requestError.name }),
      ...(typeof requestError?.errorCode === "string" && { errorCode: requestError.errorCode }),
      ...(requestError?.statusCode >= 500 &&
        typeof requestError?.stack === "string" && { stack: requestError.stack }),
    };

    if (aborted) {
      const logAbort =
        statusCode >= 500 || requestError?.statusCode >= 500 ? logger.error : logger.warn;
      logAbort("Request aborted", logData);
    } else if (statusCode >= 500) {
      logger.error("Request failed", logData);
    } else if (statusCode >= 400) {
      logger.warn("Request rejected", logData);
    } else {
      logger.info("Request completed", logData);
    }
  };

  res.once("finish", () => logOutcome());
  res.once("close", () => {
    if (!res.writableFinished) {
      logOutcome(true);
    }
  });

  next();
};

module.exports = requestLogger;
