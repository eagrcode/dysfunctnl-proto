const fs = require("fs").promises;
const { logger } = require("../../lib/logger");

const uploadCleanup = async (err, req, res, next) => {
  if (!err || !req.file?.path) {
    return next(err);
  }

  try {
    await fs.unlink(req.file.path);
    logger.info("Cleaned up temporary upload", { filePath: req.file.path });
  } catch (cleanupError) {
    logger.error("Failed to clean up temporary upload", {
      filePath: req.file.path,
      error: cleanupError,
    });
  }

  next(err);
};

module.exports = uploadCleanup;
