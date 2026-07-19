// Integration demonstration: creates two temporary users in the configured
// database, runs both refresh strategies, and removes those users afterward.
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const pool = require("../../../_shared/utils/db");

if (process.env.NODE_ENV !== "test") {
  throw new Error("Refresh storm demo must run with NODE_ENV=test");
}

const CALL_COUNT = 5;
const createdUserIds = [];

function createBarrier(target) {
  let waiting = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  return async () => {
    waiting += 1;

    if (waiting === target) {
      release();
    }

    await gate;
  };
}

async function createSession() {
  const email = `refresh-storm-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = "StormTest1234";

  const registration = await request(app).post("/auth/register").send({
    email,
    password,
    first_name: "Refresh",
    last_name: "Storm",
  });

  if (registration.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(registration.body)}`);
  }

  const login = await request(app).post("/auth/login").send({ email, password });

  if (login.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  }

  const { user } = login.body;
  createdUserIds.push(user.id);

  return {
    accessToken: jwt.sign(
      {
        id: user.id,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      process.env.JWT_SECRET,
    ),
    refreshToken: user.refreshToken,
  };
}

const getGroups = (accessToken) =>
  request(app).get("/groups").set("Authorization", `Bearer ${accessToken}`);

const postRefresh = (refreshToken) =>
  request(app).post("/auth/refresh").send({ refreshToken });

async function runWithoutDeduplication() {
  const tokens = await createSession();
  const allCallersReady = createBarrier(CALL_COUNT);
  let refreshRequests = 0;

  const callApi = async () => {
    const firstResponse = await getGroups(tokens.accessToken);

    if (
      firstResponse.status !== 401 ||
      firstResponse.body.code !== "ACCESS_TOKEN_EXPIRED"
    ) {
      return `unexpected:${firstResponse.status}:${firstResponse.body.code}`;
    }

    // All five callers capture the same refresh token before any POST starts.
    const capturedRefreshToken = tokens.refreshToken;
    await allCallersReady();

    refreshRequests += 1;
    const refreshResponse = await postRefresh(capturedRefreshToken);

    if (refreshResponse.status !== 200) {
      return `rejected:${refreshResponse.body.code}`;
    }

    tokens.accessToken = refreshResponse.body.accessToken;
    tokens.refreshToken = refreshResponse.body.refreshToken;

    const retryResponse = await getGroups(tokens.accessToken);
    return retryResponse.status === 200 ? "fulfilled" : `retry:${retryResponse.status}`;
  };

  const results = await Promise.all(
    Array.from({ length: CALL_COUNT }, () => callApi()),
  );

  return { refreshRequests, results };
}

async function runWithSharedPromise() {
  const tokens = await createSession();
  const allCallersReady = createBarrier(CALL_COUNT);
  let refreshPromise = null;
  let refreshRequests = 0;

  const refreshOnce = () => {
    if (!refreshPromise) {
      refreshRequests += 1;

      refreshPromise = postRefresh(tokens.refreshToken)
        .then((response) => {
          if (response.status !== 200) {
            throw new Error(response.body.code ?? `HTTP_${response.status}`);
          }

          tokens.accessToken = response.body.accessToken;
          tokens.refreshToken = response.body.refreshToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    return refreshPromise;
  };

  const callApi = async () => {
    const firstResponse = await getGroups(tokens.accessToken);

    if (
      firstResponse.status !== 401 ||
      firstResponse.body.code !== "ACCESS_TOKEN_EXPIRED"
    ) {
      return `unexpected:${firstResponse.status}:${firstResponse.body.code}`;
    }

    // All five callers reach refreshOnce together, just like simultaneous 401s.
    await allCallersReady();
    await refreshOnce();

    const retryResponse = await getGroups(tokens.accessToken);
    return retryResponse.status === 200 ? "fulfilled" : `retry:${retryResponse.status}`;
  };

  const results = await Promise.all(
    Array.from({ length: CALL_COUNT }, () => callApi()),
  );

  return { refreshRequests, results };
}

function verifyResults(withoutDeduplication, withSharedPromise) {
  const brokenSuccesses = withoutDeduplication.results.filter(
    (result) => result === "fulfilled",
  ).length;
  const brokenFailures = withoutDeduplication.results.filter(
    (result) => result === "rejected:REFRESH_TOKEN_INVALID",
  ).length;

  if (
    withoutDeduplication.refreshRequests !== 5 ||
    brokenSuccesses !== 1 ||
    brokenFailures !== 4
  ) {
    throw new Error("The non-deduplicated storm did not produce the expected race");
  }

  if (
    withSharedPromise.refreshRequests !== 1 ||
    !withSharedPromise.results.every((result) => result === "fulfilled")
  ) {
    throw new Error("The shared-promise storm did not recover every request");
  }
}

async function cleanup() {
  if (createdUserIds.length === 0) return;

  await pool.query("DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])", [
    createdUserIds,
  ]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
}

async function main() {
  console.log("\nRunning refresh storm without a shared promise...");
  const withoutDeduplication = await runWithoutDeduplication();
  console.log(JSON.stringify(withoutDeduplication, null, 2));

  console.log("\nRunning the same storm with a shared promise...");
  const withSharedPromise = await runWithSharedPromise();
  console.log(JSON.stringify(withSharedPromise, null, 2));

  verifyResults(withoutDeduplication, withSharedPromise);
  console.log("\nRefresh storm demonstration passed.\n");
}

main()
  .catch((error) => {
    console.error("Refresh storm demonstration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } finally {
      await pool.end();
    }
  });
