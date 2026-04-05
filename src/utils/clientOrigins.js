const config = require("../config");

const clientOrigins = config.cors.clientOrigins;

const isAllowedClientOrigin = (origin) => clientOrigins.includes(origin);

module.exports = {
  DEFAULT_CLIENT_ORIGINS: config.DEFAULT_CLIENT_ORIGINS,
  clientOrigins,
  isAllowedClientOrigin,
};
