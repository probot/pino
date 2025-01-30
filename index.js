"use strict";

const { Transform } = require("node:stream");

const { prettyFactory } = require("pino-pretty");
const { init, withScope, captureException } = require("@sentry/node");

const LEVEL_MAP = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

const pinoIgnore = [
  // default pino keys
  "time",
  "pid",
  "hostname",
  // remove keys from pino-http
  "req",
  "res",
  "responseTime",
].join(",");

const pinoErrorProps = [
  "event",
  "status",
  "headers",
  "request",
  "sentryEventId",
].join(",");

/**
 * Implements Probot's default logging formatting and error captioning using Sentry.
 *
 * @param {import("./").Options} options
 * @returns Transform
 * @see https://getpino.io/#/docs/transports
 */
function getTransformStream(options = {}) {
  const formattingEnabled = options.logFormat !== "json";

  const levelAsString = options.logLevelInString;
  const sentryEnabled = !!options.sentryDsn;

  if (sentryEnabled) {
    init({
      dsn: options.sentryDsn,
      // See https://github.com/getsentry/sentry-javascript/issues/1964#issuecomment-688482615
      // 6 is enough to serialize the deepest property across all GitHub Event payloads
      normalizeDepth: 6,
    });
  }

  const pretty = prettyFactory({
    ignore: pinoIgnore,
    errorProps: pinoErrorProps,
  });

  return new Transform({
    objectMode: true,
    transform(chunk, enc, cb) {
      const line = chunk.toString().trim();

      /* c8 ignore start */
      if (line === undefined) return cb();
      /* c8 ignore stop */

      const data = sentryEnabled ? JSON.parse(line) : null;

      if (!sentryEnabled || data.level < 50) {
        if (formattingEnabled) {
          return cb(null, pretty(line));
        }

        if (levelAsString) {
          return cb(null, stringifyLogLevel(JSON.parse(line)));
        }

        cb(null, line + "\n");
        return;
      }

      withScope((scope) => {
        const sentryLevelName = data.level === 50 ? "error" : "fatal";
        scope.setLevel(sentryLevelName);

        if (data.event) {
          scope.setExtra("event", data.event);
        }
        if (data.headers) {
          scope.setExtra("headers", data.headers);
        }
        if (data.request) {
          scope.setExtra("request", data.request);
        }
        if (data.status) {
          scope.setExtra("status", data.status);
        }

        // set user id and username to installation ID and account login
        const payload = data.event?.payload || data.err?.event?.payload;
        if (payload) {
          const {
            // When GitHub App is installed organization wide
            installation: { id, account: { login: account } = {} } = {},

            // When the repository belongs to an organization
            organization: { login: organization } = {},
            // When the repository belongs to a user
            repository: { owner: { login: owner } = {} } = {},
          } = payload;

          scope.setUser({
            id,
            username: account || organization || owner,
          });
        }

        const sentryEventId = captureException(toSentryError(data));

        // reduce logging data and add reference to sentry event instead
        if (data.event) {
          data.event = { id: data.event.id };
        }
        if (data.request) {
          data.request = {
            method: data.request.method,
            url: data.request.url,
          };
        }
        data.sentryEventId = sentryEventId;

        if (formattingEnabled) {
          return cb(null, pretty(data));
        }

        /* c8 ignore start */
        if (levelAsString) {
          return cb(null, stringifyLogLevel(data));
        }
        /* c8 ignore stop */

        cb(null, JSON.stringify(data) + "\n");
      });
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

module.exports = getTransformStream;
module.exports.default = getTransformStream;
module.exports.getTransformStream = getTransformStream;
