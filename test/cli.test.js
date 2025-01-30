"use strict";

const { join: pathJoin } = require("node:path");
const { spawn } = require("node:child_process");
const { test } = require("tap");

const cliPath = require.resolve(pathJoin(__dirname, "..", "bin", "cli.js"));
const nodeBinaryPath = process.argv[0];

const logLine =
  '{"level":30,"time":1445858940000,"name":"probot","msg":"hello future","pid":42,"hostname":"foo"}\n';
const errorLine =
  '{"level":50,"time":1597399283686,"pid":35269,"hostname":"Gregors-MacBook-Pro.local","name":"probot","status":500,"event":{"event":"installation_repositories.added","id":"123","installation":456},"headers":{"x-github-request-id":"789"},"request":{"headers":{"accept":"application/vnd.github.v3+json","authorization":"[Filtered]","user-agent":"probot/10.0.0"},"method":"GET","url":"https://api.github.com/repos/octocat/hello-world/"},"stack":"Error: Oops\\n    at Object.<anonymous> (/Users/gregor/Projects/probot/pino/example.js:37:15)\\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\\n    at Module.load (internal/modules/cjs/loader.js:985:32)\\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)\\n    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)\\n    at internal/main/run_main_module.js:17:47","type":"Error","msg":"Oops"}\n';

const stripAnsiColorRE =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const env = {
  // disable colors
  TERM: "dumb",
};

test("cli", (t) => {
  t.plan(4);

  t.test(
    "formats using pino-pretty and Probot's preferences by default",
    (t) => {
      t.plan(1);
      const child = spawn(nodeBinaryPath, [cliPath], { env });
      child.on("error", t.threw);
      child.stdout.on("data", (data) => {
        t.equal(
          data.toString().replace(stripAnsiColorRE, ""),
          `INFO (probot): hello future\n`,
        );
      });
      child.stdin.write(logLine);
      t.teardown(() => child.kill());
    },
  );

  t.test("errors include event, status, headers, and request keys", (t) => {
    t.plan(4);
    const child = spawn(nodeBinaryPath, [cliPath], { env });
    child.on("error", t.threw);
    child.stdout.on("data", (data) => {
      t.match(
        data.toString().replace(stripAnsiColorRE, ""),
        /event: "installation_repositories.added"/,
      );
      t.match(data.toString().replace(stripAnsiColorRE, ""), /status: 500/);
      t.match(
        data.toString().replace(stripAnsiColorRE, ""),
        /x-github-request-id: "789"/,
      );
      t.match(
        data.toString(),
        /url: "https:\/\/api.github.com\/repos\/octocat\/hello-world\/"/,
      );
    });
    child.stdin.write(errorLine);
    t.teardown(() => child.kill());
  });

  t.test("LOG_FORMAT=json", (t) => {
    t.plan(1);
    const child = spawn(nodeBinaryPath, [cliPath], {
      env: { ...env, LOG_FORMAT: "json" },
    });
    child.on("error", t.threw);
    child.stdout.on("data", (data) => {
      t.equal(data.toString().replace(stripAnsiColorRE, ""), logLine);
    });
    child.stdin.write(logLine);
    t.teardown(() => child.kill());
  });

  t.test("LOG_LEVEL_IN_STRING=true", (t) => {
    t.plan(1);
    const child = spawn(nodeBinaryPath, [cliPath], {
      env: { ...env, LOG_FORMAT: "json", LOG_LEVEL_IN_STRING: "true" },
    });
    child.on("error", t.threw);
    child.stdout.on("data", (data) => {
      t.equal(
        data.toString().replace(stripAnsiColorRE, ""),
        logLine.replace('"level":30', '"level":"info"'),
      );
    });
    child.stdin.write(logLine);
    t.teardown(() => child.kill());
  });
});
