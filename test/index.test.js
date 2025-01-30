"use strict";

const { Writable: WritableStream } = require("stream");

const { test } = require("tap");
const { pino } = require("pino");
const { getTransformStream } = require("..");

test("API", (t) => {
  let env = Object.assign({}, process.env);

  t.afterEach(() => {
    process.env = { ...env };
  });

  t.test("getTransformStream export", (t) => {
    t.type(getTransformStream, Function);
    t.end();
  });

  t.test("getTransformStream without options", (t) => {
    getTransformStream();
    t.end();
  });

  t.test(
    "A single \\n is added to the end log lines when LOG_FORMAT is set to 'json' (https://github.com/probot/probot/issues/1334)",
    (t) => {
      const streamLogsToOutput = new WritableStream({ objectMode: true });
      const output = [];
      streamLogsToOutput._write = (line, encoding, done) => {
        output.push(line);
        done();
      };

      const transform = getTransformStream({
        logFormat: "json",
        logLevelInString: true,
      });
      transform.pipe(streamLogsToOutput);
      const log = pino({}, transform);

      log.info("test");

      t.equal(
        output.join(""),
        output.join("").trim() + "\n",
        'No "\\n" is added to end of line',
      );

      t.equal(JSON.parse(output).level, "info");

      t.end();
    },
  );

  t.end();
});
