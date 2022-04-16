const pump = require("pump");

const getTransformStream = require("./");

const options = {
  logFormat: process.env.LOG_FORMAT,
  logLevelInString: process.env.LOG_LEVEL_IN_STRING,
  sentryDsn: process.env.SENTRY_DSN,
};

const res = getTransformStream(opts)
pump(process.stdin, res)
