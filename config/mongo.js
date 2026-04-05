const mongoose = require("mongoose");
const config = require("../src/config");

const connectDB = async () => mongoose.connect(config.database.uri);

module.exports = connectDB;
