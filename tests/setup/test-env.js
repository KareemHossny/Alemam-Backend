process.env.NODE_ENV = "test";
process.env.VERCEL = "1";
process.env.PORT = process.env.PORT || "5001";
process.env.CLIENT_ORIGINS = process.env.CLIENT_ORIGINS || "http://localhost:3000";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/emam-test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "0123456789abcdef0123456789abcdef";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
