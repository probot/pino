const Stream = require("stream");

const test = require("tap").test;
const pino = require("pino");
const { getTransformStream } = require("..");

test("API", (t) => {
  t.test("getTransformStream export", (t) => {
    t.isA(getTransformStream, Function);
    t.end();
  });

  t.test(
    "A single \\n is added to the end log lines when LOG_FORMAT is set to 'json' (https://github.com/probot/probot/issues/1334)",
    (t) => {
      process.env.LOG_FORMAT = "json";

      const streamLogsToOutput = new Stream.Writable({ objectMode: true });
      const output = [];
      streamLogsToOutput._write = (line, encoding, done) => {
        output.push(line);
        done();
      };

      const transform = getTransformStream();
      transform.pipe(streamLogsToOutput);
      const log = pino({}, transform);

      log.info("test");

      t.equal(
        output.join(""),
        output.join("").trim() + "\n",
        'No "\\n" is added to end of line'
      );

      delete process.env.LOG_FORMAT;
      t.end();
    }
  );

  t.end();
});
