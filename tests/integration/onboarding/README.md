# Onboarding tests

Run from the server directory:

```sh
LOG_LEVEL=error DOTENV_CONFIG_QUIET=true npm test -- --runInBand tests/integration/onboarding
```

These integration tests call `POST /onboarding/join-group` through the real app,
authentication middleware, controller, models, and PostgreSQL transaction helper.
They use `registerUser`, `loginUser`, `createGroup`, and `addMember` from the shared
test helpers. Invite fixtures are inserted directly because invite creation does
not have an endpoint yet.

Use the same development/test database configuration as the existing integration
tests, including `JWT_SECRET` and `TEST_USER_PASSWORD`. The database must contain
the invitation tables defined in the project's `sql.sql`, and the configured role
needs SELECT, INSERT, UPDATE, and DELETE access to those tables for fixture setup,
redemption, and cleanup.

The local `dys` database grants applied for `app_user` are:

```sql
GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON TABLE public.group_invites,
public.group_invite_codes TO app_user;
```

Every test creates its own users, group, and invite. `afterEach` restores spies and
deletes only the users with the exact unique emails recorded for that test. The
database's cascading foreign keys remove their groups, memberships, roles, invites,
codes, and refresh tokens. Cleanup also runs after failed tests and partial setup.
`afterAll` closes the database pool.

Covered cases:

- Missing, invalid, expired, and incorrectly signed access tokens.
- The controller's defensive guard when called without an authenticated user.
- Missing, empty, incorrectly sized, and non-string invite codes.
- Unknown, lowercase, whitespace, and SQL-like code input.
- Successful redemption using the authenticated user ID and a non-admin role.
- Expired, used, and deleted invites; existing members and group creators.
- Reuse by the same user and another user.
- Concurrent redemption by the same user and different users.
- Failure at each database operation and before commit, with rollback and retry.
- Missing inserted member, zero-row invite update, and connection failure.

Rate limiters are bypassed only in this suite so repeated fixture registration can
run. Failure tests temporarily intercept one query on a real client; all remaining
queries and rollback use PostgreSQL. Those tests simulate failures before commit,
not an ambiguous network failure after PostgreSQL has already committed.

Six-character strings with unsupported characters currently produce 404 rather
than 400: the controller checks type and length, and the database lookup rejects
codes that do not exist. These tests preserve that behaviour.
