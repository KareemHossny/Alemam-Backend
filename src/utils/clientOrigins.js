const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://alemam-admin.vercel.app",
  "https://alemam-engineer.vercel.app",
  "https://alemam-supervisor.vercel.app",
];

const configuredOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const clientOrigins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CLIENT_ORIGINS;

const isAllowedClientOrigin = (origin) => clientOrigins.includes(origin);

module.exports = {
  clientOrigins,
  isAllowedClientOrigin,
};
