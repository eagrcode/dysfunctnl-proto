const fs = require("fs").promises;

const uploadCleanup = async (err, req, res, next) => {
  if (!err || !req.file?.path) {
    return next(err);
  }

  try {
    await fs.unlink(req.file.path);
    console.log(`Cleaned up temp file: ${req.file.path}`);
  } catch (cleanupError) {
    console.error("Failed to clean up temp file:", cleanupError.message);
  }

  next(err);
};

module.exports = uploadCleanup;
