const test = require("node:test");
const assert = require("node:assert/strict");

require("../setup/test-env");

const { resolveFromRoot, withMockedModules } = require("../helpers/module-mocks");
const { startTestServer, stopTestServer } = require("../helpers/test-server");

const serverModulePath = resolveFromRoot("server.js");
const mongoModulePath = resolveFromRoot("config", "mongo.js");
const userRepositoryModulePath = resolveFromRoot("src", "modules", "user", "user.repository.js");
const adminRoutesModulePath = resolveFromRoot("routes", "admin.js");
const adminControllerModulePath = resolveFromRoot("controllers", "admin.js");
const authServiceModulePath = resolveFromRoot("src", "services", "auth.service.js");

const createMongoMock = () => {
  const connectDB = async () => ({ readyState: 1 });

  connectDB.connectDB = connectDB;
  connectDB.getConnectionState = () => 1;
  connectDB.isDatabaseConnected = () => true;

  return connectDB;
};

test("POST /api/admin/login authenticates an admin and sets the session cookie", async () => {
  const fakeUser = {
    _id: "507f1f77bcf86cd799439011",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    comparePassword: async (password) => password === "correct-password",
  };

  let server;

  await withMockedModules({
    mocks: {
      [mongoModulePath]: createMongoMock(),
      [userRepositoryModulePath]: {
        findByEmailForAuth: async (email) => (
          email === "admin@example.com" ? fakeUser : null
        ),
      },
    },
    clear: [
      serverModulePath,
      adminRoutesModulePath,
      adminControllerModulePath,
      authServiceModulePath,
    ],
  }, async () => {
    const app = require(serverModulePath);
    const startedServer = await startTestServer(app);
    server = startedServer.server;

    const response = await fetch(`${startedServer.baseUrl}/api/admin/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "ADMIN@example.com",
        password: "correct-password",
      }),
    });

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.message, "Admin login successful");
    assert.deepEqual(payload.data.user, {
      id: fakeUser._id,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });

    const sessionCookie = response.headers.get("set-cookie") || "";
    assert.match(sessionCookie, /admin_session=/);
    assert.match(sessionCookie, /HttpOnly/i);
  });

  await stopTestServer(server);
});

