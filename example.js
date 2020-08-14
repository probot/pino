"use strict";

var pino = require("pino")({
  name: "probot",
});

// random logs
pino.info("hello world");
pino.error("this is at error level");
pino.info("the answer is %d", 42);
pino.info({ obj: 42 }, "hello world");
pino.info({ obj: 42, b: 2 }, "hello world");
pino.info({ obj2: { aa: "bbb" } }, "another");
setImmediate(function () {
  pino.info("after setImmediate");
});
pino.error(new Error("an error"));

var child = pino.child({ a: "property" });
child.info("hello child!");

var childsChild = child.child({ another: "property" });
childsChild.info("hello baby..");

pino.debug("this should be mute");

pino.level = "trace";

pino.debug("this is a debug statement");

pino
  .child({ another: "property" })
  .debug("this is a debug statement via child");
pino.trace("this is a trace statement");

pino.debug('this is a "debug" statement with "');

// probot-specific logs
const error = new Error("Oops");
error.status = 500;
error.event = {
  event: "installation_repositories.added",
  id: "123",
  installation: 456,
};
error.headers = {
  "x-github-request-id": "789",
};
error.request = {
  headers: {
    accept: "application/vnd.github.v3+json",
    authorization: "[Filtered]",
    "user-agent": "probot/10.0.0",
  },
  method: "GET",
  url: "https://api.github.com/repos/octocat/hello-world/",
};
pino.error(error);
