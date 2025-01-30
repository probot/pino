"use strict";

const { join: pathJoin } = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
const { test } = require("tap");
const { once } = require("node:events");

const SENTRY_DSN = "http://username@example.com/1234";

const cliPath = require.resolve(pathJoin(__dirname, "..", "bin", "cli.js"));
const nodeBinaryPath = process.argv[0];

const errorLine =
  '{"level":50,"time":1597399283686,"pid":35269,"hostname":"Gregors-MacBook-Pro.local","name":"probot","status":500,"event":{"event":"installation_repositories.added","id":"123","installation":456},"headers":{"x-github-request-id":"789"},"request":{"headers":{"accept":"application/vnd.github.v3+json","authorization":"[Filtered]","user-agent":"probot/10.0.0"},"method":"GET","url":"https://api.github.com/repos/octocat/hello-world/"},"stack":"Error: Oops\\n    at Object.<anonymous> (/Users/gregor/Projects/probot/pino/example.js:37:15)\\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\\n    at Module.load (internal/modules/cjs/loader.js:985:32)\\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)\\n    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)\\n    at internal/main/run_main_module.js:17:47","type":"Error","msg":"Oops"}\n';
const fatalErrorLine =
  '{"level":60,"time":1597426544906,"pid":43024,"hostname":"Gregors-MacBook-Pro.local","name":"probot","stack":"Error: Oh no!\\n    at Object.<anonymous> (/Users/gregor/Projects/probot/pino/example.js:59:12)\\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\\n    at Module.load (internal/modules/cjs/loader.js:985:32)\\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)\\n    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)\\n    at internal/main/run_main_module.js:17:47","type":"Error","msg":"Oh no!"}\n';

const stripAnsiColorRE =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const env = {
  // disable colors
  TERM: "dumb",
};

test("SENTRY_DSN", (t) => {
  t.plan(2);

  t.test("SENTRY_DSN with ERROR error", async (t) => {
    t.plan(2);

    const server = createServer((request, response) => {
      // we can access HTTP headers
      let body = "";
      request.on("data", (chunk) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        const data = JSON.parse(body.split("\n")[2]);
        const error = data.exception.values[0];

        t.equal(error.type, "Error");
        t.equal(error.value, "Oops");
        t.strictSame(data.extra, {
          event: {
            event: "installation_repositories.added",
            id: "123",
            installation: 456,
          },
          headers: { "x-github-request-id": "789" },
          request: {
            headers: {
              accept: "application/vnd.github.v3+json",
              authorization: "[Filtered]",
              "user-agent": "probot/10.0.0",
            },
            method: "GET",
            url: "https://api.github.com/repos/octocat/hello-world/",
          },
          status: 500,
        });
      });

      response.writeHead(200);
      response.write("ok");
      response.end();
    });

    server.listen(0);

    await once(server, "listening");

    const child = spawn(nodeBinaryPath, [cliPath], {
      env: {
        ...env,
        SENTRY_DSN,
      },
    });
    child.on("error", t.threw);
    child.stdout.on("data", (data) => {
      const errorStringLines = data
        .toString()
        .replace(stripAnsiColorRE, "")
        .split(/\n/);
      t.equal(errorStringLines[0].trim(), "ERROR (probot): Oops");

      // skip the error stack, normalize Sentry Event ID, compare error details only
      t.equal(
        errorStringLines
          .slice(9)
          .join("\n")
          .trim()
          .replace(/sentryEventId: \w+$/, "sentryEventId: 123"),
        `event: {
        id: "123"
    }
    status: 500
    headers: {
        x-github-request-id: "789"
    }
    request: {
        method: "GET"
        url: "https://api.github.com/repos/octocat/hello-world/"
    }
    sentryEventId: 123`,
      );
    });
    child.stdin.write(errorLine);

    t.teardown(() => {
      child.kill();
      server.closeAllConnections();
      server.close();
    });
  });

  t.test("SENTRY_DSN with FATAL error", async (t) => {
    t.plan(1);

    const server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        const data = JSON.parse(body.split("\n")[2]);
        const error = data.exception.values[0];

        t.equal(error.type, "Error");
        t.equal(error.value, "Oh no!");
      });

      response.writeHead(200);
      response.write("ok");
      response.end();
    });

    server.listen(0);
    await once(server, "listening");

    const child = spawn(nodeBinaryPath, [cliPath], {
      env: {
        ...env,
        SENTRY_DSN,
      },
    });
    child.on("error", t.threw);
    child.stdout.on("data", (data) => {
      t.match(
        data.toString().replace(stripAnsiColorRE, ""),
        /^FATAL \(probot\): Oh no!\n/,
      );
    });
    child.stdin.write(fatalErrorLine);

    t.teardown(() => {
      child.kill();
      server.closeAllConnections();
      server.close();
    });
  });
});
