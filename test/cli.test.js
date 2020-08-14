const path = require("path");
const spawn = require("child_process").spawn;
const test = require("tap").test;

const cliPath = require.resolve(path.join(__dirname, "..", "cli.js"));
const nodeBinaryPath = process.argv[0];

const logLine =
  '{"level":30,"time":1445858940000,"name":"probot","msg":"hello future","pid":42,"hostname":"foo","v":1}\n';

const env = {
  // disable colors
  TERM: "dumb",
};

test("cli", (t) => {
  t.test(
    "formats using pino-pretty and Probot's preferences by default",
    (t) => {
      t.plan(1);
      const child = spawn(nodeBinaryPath, [cliPath], { env });
      child.on("error", t.threw);
      child.stdout.on("data", (data) => {
        t.is(data.toString(), `INFO  (probot): hello future\n`);
      });
      child.stdin.write(logLine);
      t.tearDown(() => child.kill());
    }
  );

  t.end();
});
