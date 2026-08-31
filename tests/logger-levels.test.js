const { spawnSync } = require("node:child_process");
const path = require("node:path");

const loggerPath = path.resolve(__dirname, "../src/lib/logger.js");
const levels = ["debug", "info", "warn", "error"];

test.each([
  ["development", undefined, ["debug", "info", "warn", "error"]],
  ["production", undefined, ["info", "warn", "error"]],
  ["development", "warn", ["warn", "error"]],
  ["production", "debug", ["debug", "info", "warn", "error"]],
])("%s with LOG_LEVEL=%s emits %j", (environment, override, expectedLevels) => {
  const env = { ...process.env, NODE_ENV: environment };
  delete env.LOG_LEVEL;
  if (override !== undefined) env.LOG_LEVEL = override;

  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `const { logger } = require(process.argv[1]);
       for (const level of ["debug", "info", "warn", "error"]) {
         logger[level]("level-check-" + level, { enabled: true });
       }`,
      loggerPath,
    ],
    { env, encoding: "utf8", timeout: 10000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  const output = result.stdout + result.stderr;

  for (const level of levels) {
    expect(output.includes(`level-check-${level}`)).toBe(expectedLevels.includes(level));
  }
  if (environment === "production") {
    expect(output).not.toMatch(/\u001b\[/);
  }
});
