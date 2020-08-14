const { Transform } = require("readable-stream");

const pump = require("pump");
const split = require("split2");
const prettyFactory = require("pino-pretty");

const formattingEnabled = process.env.LOG_FORMAT !== "json";
const levelAsString = process.env.LOG_LEVEL_IN_STRING === "true";

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
});

const probotTransport = new Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    const line = formattingEnabled
      ? pretty(chunk.toString())
      : levelAsString
      ? stringifyLogLevel(chunk) + "\n"
      : chunk.toString() + "\n";

    /* istanbul ignore if */
    if (line === undefined) return cb();

    cb(null, line);
  },
});

pump(process.stdin, split(), probotTransport, process.stdout);

const LEVEL_MAP = {
  "10": "trace",
  "20": "debug",
  "30": "info",
  "40": "warn",
  "50": "error",
  "60": "fatal",
};

function stringifyLogLevel(chunk) {
  const data = JSON.parse(chunk.toString());
  data.level = LEVEL_MAP[data.level];
  return JSON.stringify(data);
}
