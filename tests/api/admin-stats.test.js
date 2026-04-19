const test = require("node:test");
const assert = require("node:assert/strict");

require("../setup/test-env");

const { resolveFromRoot, withMockedModules } = require("../helpers/module-mocks");
const { startTestServer, stopTestServer } = require("../helpers/test-server");

const serverModulePath = resolveFromRoot("server.js");
const mongoModulePath = resolveFromRoot("config", "mongo.js");
const authMiddlewareModulePath = resolveFromRoot("src", "core", "middleware", "auth.js");
const authorizeMiddlewareModulePath = resolveFromRoot("src", "core", "middleware", "authorize.js");
const statsServiceModulePath = resolveFromRoot("src", "services", "stats.service.js");
const adminRoutesModulePath = resolveFromRoot("routes", "admin.js");
const adminControllerModulePath = resolveFromRoot("controllers", "admin.js");

const createMongoMock = () => {
  const connectDB = async () => ({ readyState: 1 });

  connectDB.connectDB = connectDB;
  connectDB.getConnectionState = () => 1;
  connectDB.isDatabaseConnected = () => true;

  return connectDB;
};

test("GET /api/admin/stats returns lightweight admin dashboard counts", async () => {
  const statsPayload = {
    totalUsers: 12,
    totalProjects: 5,
    totalTasks: 31,
    totalDailyTasks: 20,
    totalMonthlyTasks: 11,
    totalEngineers: 7,
    totalSupervisors: 4,
  };

  let server;

  await withMockedModules({
    mocks: {
      [mongoModulePath]: createMongoMock(),
      [authMiddlewareModulePath]: (req, _res, next) => {
        req.user = {
          id: "507f1f77bcf86cd799439012",
          role: "admin",
          email: "admin@example.com",
        };
        next();
      },
      [authorizeMiddlewareModulePath]: {
        authorizeRoles: () => (_req, _res, next) => next(),
      },
      [statsServiceModulePath]: {
        getAdminDashboardStats: async () => ({
          message: "Admin dashboard stats fetched successfully",
          data: statsPayload,
        }),
        getAdminTaskStats: async () => ({
          message: "Task stats fetched successfully",
          data: {},
        }),
        getAdminProjectStats: async () => ({
          message: "Project task stats fetched successfully",
          data: {},
        }),
      },
    },
    clear: [
      serverModulePath,
      adminRoutesModulePath,
      adminControllerModulePath,
    ],
  }, async () => {
    const app = require(serverModulePath);
    const startedServer = await startTestServer(app);
    server = startedServer.server;

    const response = await fetch(`${startedServer.baseUrl}/api/admin/stats`);

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.message, "Admin dashboard stats fetched successfully");
    assert.deepEqual(payload.data, statsPayload);
  });

  await stopTestServer(server);
});

