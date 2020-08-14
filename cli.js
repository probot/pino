const { Transform } = require("readable-stream");

const pump = require("pump");
const split = require("split2");
const prettyFactory = require("pino-pretty");

const formattingEnabled = process.env.LOG_FORMAT !== "json";

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
    const line = pretty(chunk.toString());
    if (line === undefined) return cb();
    cb(null, line);
  },
});

if (formattingEnabled) {
  pump(process.stdin, split(), probotTransport, process.stdout);
} else {
  pump(process.stdin, process.stdout);
}
