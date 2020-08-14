"use strict";

var pino = require("pino")({
  name: "probot",
});

// simulate probot.log.info()
pino.info("hello future");

// simulate a request error thrown in a webhook event handler
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

// simulate fatal error
pino.fatal(new Error("Oh no!"));
