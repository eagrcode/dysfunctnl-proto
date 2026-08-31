const featureFlags = Object.freeze({
  mediaUploads: process.env.MEDIA_UPLOADS_ENABLED === "true",
});

module.exports = { featureFlags };
