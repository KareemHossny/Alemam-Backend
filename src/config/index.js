const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const DEFAULT_CLIENT_ORIGINS = Object.freeze([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
]);

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const SAME_SITE_VALUES = ["strict", "lax", "none"];

const integerFromEnv = (fieldName, defaultValue) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z
    .number({
      invalid_type_error: `${fieldName} must be a number`,
    })
    .int(`${fieldName} must be an integer`)
    .positive(`${fieldName} must be greater than 0`));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL: z.string().optional(),
  PORT: integerFromEnv("PORT", 5000),
  TRUST_PROXY_HOPS: integerFromEnv("TRUST_PROXY_HOPS", 1),
  MONGO_URI: z.string().trim().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().trim().min(16, "JWT_SECRET must be at least 16 characters"),
  ADMIN_EMAIL: z.string().trim().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  CLIENT_ORIGINS: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => SAME_SITE_VALUES.includes(value), {
      message: "AUTH_COOKIE_SAME_SITE must be one of strict, lax, or none",
    })
    .optional(),
  LOG_LEVEL: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => LOG_LEVELS.includes(value), {
      message: `LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}`,
    })
    .optional(),
  LOG_SERVICE_NAME: z.string().trim().min(1).optional(),
});

const formatEnvIssues = (issues = []) =>
  issues
    .map((issue) => {
      const fieldName = issue.path.join(".") || "env";
      return `- ${fieldName}: ${issue.message}`;
    })
    .join("\n");

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration:\n${formatEnvIssues(parsedEnv.error.issues)}`);
}

const env = parsedEnv.data;
const isVercel = env.VERCEL === "1";
const isProduction = env.NODE_ENV === "production" || isVercel;

const configuredOrigins = (env.CLIENT_ORIGINS || env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && configuredOrigins.length === 0) {
  throw new Error("Invalid environment configuration:\n- CLIENT_ORIGINS: CLIENT_ORIGINS is required in production");
}

const config = Object.freeze({
  app: Object.freeze({
    env: env.NODE_ENV,
    isProduction,
    isVercel,
    port: env.PORT,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    shouldStartServer: !isVercel,
  }),
  database: Object.freeze({
    uri: env.MONGO_URI,
  }),
  auth: Object.freeze({
    jwtSecret: env.JWT_SECRET,
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    cookieSameSite: env.AUTH_COOKIE_SAME_SITE || (isProduction ? "none" : "lax"),
  }),
  cors: Object.freeze({
    clientOrigins: configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CLIENT_ORIGINS,
  }),
  logging: Object.freeze({
    level: env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    serviceName: env.LOG_SERVICE_NAME || "alemam-task-manager-api",
  }),
});

module.exports = config;
module.exports.DEFAULT_CLIENT_ORIGINS = DEFAULT_CLIENT_ORIGINS;
