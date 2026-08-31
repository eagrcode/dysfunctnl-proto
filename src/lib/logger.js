// src/_shared/logger/logger.js

const path = require("path");
const util = require("util");
const winston = require("winston");

const { combine, timestamp, printf, colorize, errors } = winston.format;

const LOGGER_FILE = path.resolve(__filename);

function parseStackLine(line) {
  const match = line.match(/^\s*at\s+(?:(.*?)\s+\()?(.+):(\d+):(\d+)\)?$/);

  if (!match) return null;

  const filePath = match[2];
  const lineNumber = match[3];

  return {
    filePath,
    lineNumber,
  };
}

function getCallerInfo() {
  const stack = new Error().stack?.split("\n") || [];

  for (const line of stack) {
    const parsed = parseStackLine(line);

    if (!parsed) continue;

    const resolvedFilePath = path.resolve(parsed.filePath);

    const isLoggerFile = resolvedFilePath === LOGGER_FILE;
    const isNodeInternal = parsed.filePath.startsWith("node:");
    const isNodeModules = parsed.filePath.includes(`${path.sep}node_modules${path.sep}`);

    if (isLoggerFile || isNodeInternal || isNodeModules) {
      continue;
    }

    return {
      file: `${path.relative(process.cwd(), parsed.filePath)}:${parsed.lineNumber}`,
    };
  }

  return {
    file: "unknown",
  };
}

function formatData(data) {
  if (data === undefined) return "";

  return util.inspect(data, {
    depth: null,
    colors: true,
    compact: false,
  });
}

const consoleFormat = printf((info) => {
  const { timestamp, level, message, file, data, stack } = info;

  const dataOutput = data !== undefined ? `\n${formatData(data)}` : "";
  const stackOutput = stack ? `\n${stack}` : "";

  return `${timestamp} [${level}] ${file} - ${message}${dataOutput}${stackOutput}`;
});

const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",

  format: combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" })),

  transports: [
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
});

function log(level, message, data) {
  const caller = getCallerInfo();

  baseLogger.log(level, message, {
    ...caller,
    data,
  });
}

const logger = {
  info: (message, data) => log("info", message, data),
  warn: (message, data) => log("warn", message, data),
  error: (message, data) => log("error", message, data),
  debug: (message, data) => log("debug", message, data),
};

module.exports = {
  logger,
};
