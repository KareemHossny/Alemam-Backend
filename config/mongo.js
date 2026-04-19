const mongoose = require("mongoose");
const config = require("../src/config");

let connectionPromise = null;

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const getConnectionState = () => mongoose.connection.readyState;

const connectDB = async () => {
  if (isDatabaseConnected()) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(config.database.uri, {
      serverSelectionTimeoutMS: 10000,
    })
    .then((mongooseInstance) => mongooseInstance.connection)
    .catch(async (error) => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }

      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.getConnectionState = getConnectionState;
module.exports.isDatabaseConnected = isDatabaseConnected;
