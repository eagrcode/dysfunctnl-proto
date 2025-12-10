const path = require("path");

const customConsoleLog = (message, ...data) => {
  const stack = new Error().stack;
  const callerLine = stack.split("\n")[2];
  const match = callerLine.match(/\((.*):\d+:\d+\)/);
  const fullPath = match ? match[1] : "unknown";
  const filePath = path.basename(fullPath);

  console.log(`/${filePath} | ${message}`, ...data);
};

module.exports = customConsoleLog;
