const getAllowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();
  let origin = "*";

  if (allowedOrigins.length > 0) {
    origin = allowedOrigins;
  } else if (process.env.NODE_ENV === "production") {
    origin = false;
  }

  return { origin };
};

module.exports = { getCorsOptions };
