module.exports = { getTransformStream };

const { Transform } = require("readable-stream");

const prettyFactory = require("pino-pretty");
const Sentry = require("@sentry/node");
const { ExtraErrorData } = require("@sentry/integrations");

const LEVEL_MAP = {
  "10": "trace",
  "20": "debug",
  "30": "info",
  "40": "warn",
  "50": "error",
  "60": "fatal",
};

function getTransformStream() {
  const formattingEnabled = process.env.LOG_FORMAT !== "json";
  const levelAsString = process.env.LOG_LEVEL_IN_STRING === "true";
  const sentryEnabled = !!process.env.SENTRY_DSN;

  if (sentryEnabled) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [new ExtraErrorData({ depth: 10 })],
    });
  }

  const pretty = prettyFactory({
    ignore: [
      // default pino keys
      "time",
      "pid",
      "hostname",
      // remove keys from pino-http
      "req",
      "res",
      "responseTime",
    ].join(","),
    errorProps: ["event", "status", "headers", "request"].join(","),
  });

  return new Transform({
    objectMode: true,
    transform(chunk, enc, cb) {
      const line = chunk.toString().trim();

      /* istanbul ignore if */
      if (line === undefined) return cb();

      const data = sentryEnabled ? JSON.parse(line) : null;

      if (sentryEnabled && data.level >= 50) {
        Sentry.withScope(function (scope) {
          const sentryLevelName =
            data.level === 50 ? Sentry.Severity.Error : Sentry.Severity.Fatal;
          scope.setLevel(sentryLevelName);

          for (const extra of ["event", "headers", "request", "status"]) {
            if (!data[extra]) continue;

            scope.setExtra(extra, data[extra]);
          }

          // set user id and username when available
          if (
            data.event &&
            data.event.payload &&
            data.event.payload.installation
          ) {
            const user = { id: data.event.payload.installation.id };

            /* istanbul ignore if */
            if (data.event.payload.organization) {
              user.username = data.event.payload.organization.user.login;
            }

            /* istanbul ignore if */
            if (data.event.payload.repository) {
              user.username = data.event.payload.repository.owner.login;
            }

            scope.setUser(user);
          }

          Sentry.captureException(toSentryError(data));
        });
      }

      if (formattingEnabled) {
        return cb(null, pretty(data || line));
      }

      if (levelAsString) {
        return cb(null, stringifyLogLevel(data || JSON.parse(line)));
      }

      cb(null, line + "\n");
    },
  });
}

function stringifyLogLevel(data) {
  data.level = LEVEL_MAP[data.level];
  return JSON.stringify(data) + "\n";
}

function toSentryError(data) {
  const error = new Error(data.msg);
  error.name = data.type;
  error.stack = data.stack;
  return error;
}
