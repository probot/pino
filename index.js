import { Transform } from "node:stream";
import { npxImport } from "npx-import-light";
import { prettyFactory } from "pino-pretty";

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

/** @type {import('@sentry/node').init} */
let init;
/** @type {import('@sentry/node').withScope} */
let withScope;
/** @type {import('@sentry/node').captureException} */
let captureException;

/** @type {import('@sentry/node')} */
let sentry;

/**
 * Implements Probot's default logging formatting and error captioning using Sentry.
 *
 * @param {import("./").Options} options
 * @returns {Promise<Transform>}
 * @see https://getpino.io/#/docs/transports
 */
export async function getTransformStream(options = {}) {
  const formattingEnabled = options.logFormat !== "json";

  const levelAsString = options.logLevelInString;

  const pretty = prettyFactory({
    ignore: pinoIgnore,
    errorProps: pinoErrorProps,
  });

  if (!options.sentryDsn) {
    return new Transform({
      objectMode: true,
      transform(chunk, enc, cb) {
        const line = chunk.toString().trim();

        if (formattingEnabled) {
          return cb(null, pretty(line));
        }

        if (levelAsString) {
          return cb(null, stringifyLogLevel(JSON.parse(line)));
        }

        cb(null, line + "\n");
        return;
      },
    });
  } else {
    if (!sentry) {
      // Import Sentry dynamically to avoid loading it when not needed
      sentry = await npxImport("@sentry/node@9.27.0", {
        onlyPackageRunner: true,
      });
      init = sentry.init;
      withScope = sentry.withScope;
      captureException = sentry.captureException;
    }

    init({
      dsn: options.sentryDsn,
      // See https://github.com/getsentry/sentry-javascript/issues/1964#issuecomment-688482615
      // 6 is enough to serialize the deepest property across all GitHub Event payloads
      normalizeDepth: 6,
    });
    return new Transform({
      objectMode: true,
      transform(chunk, enc, cb) {
        const line = chunk.toString().trim();

        const data = JSON.parse(line);

        if (data.level < 50) {
          if (formattingEnabled) {
            return cb(null, pretty(line));
          }

          if (levelAsString) {
            return cb(null, stringifyLogLevel(data));
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
}

function stringifyLogLevel(data) {
  data.level = LEVEL_MAP[data.level];
  return JSON.stringify(data) + "\n";
}

function toSentryError(data) {
  const error = new Error(data.msg);
  error.name = data.type || data.err?.type;
  error.stack = data.stack || data.err?.stack;
  return error;
}
