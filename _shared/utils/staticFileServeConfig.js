const express = require("express");
const uploadConfig = require("../utils/uploadConfig");

const staticFileServeConfig = express.static(uploadConfig.basePath, {
  maxAge: "30d",
  immutable: true,
  setHeaders: (res, filePath) => {
    res.set("X-Content-Type-Options", "nosniff");

    if (process.env.NODE_ENV === "development") {
      console.log(`Serving: ${filePath}`);
    }
  },
});

module.exports = staticFileServeConfig;
