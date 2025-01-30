"use strict";

const { withScope } = require("@sentry/node");

const { test } = require("tap");
const { pino } = require("pino");
const { getTransformStream } = require("..");

test("API", (t) => {
  t.plan(1);

  let env = Object.assign({}, process.env);

  t.afterEach(() => {
    process.env = { ...env };
  });

  t.test("Sentry integration enabled", (t) => {
    t.plan(6);
    const transform = getTransformStream({
      sentryDsn: "http://username@example.com/1234",
    });
    const log = pino({}, transform);

    function event(payload) {
      const error = new Error("Hello from the test");
      error.level = 50;
      error.event = {
        payload: Object.assign(
          {
            installation: {
              id: "456",
            },
          },
          payload,
        ),
      };
      return error;
    }

    t.test("without user", (t) => {
      t.plan(1);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.strictSame(event.user, { id: "456" });
        });

        log.fatal(event({}));
      });
    });

    t.test("with organization", (t) => {
      t.plan(1);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.match(event.user, { username: "org" });
        });

        log.fatal(event({ organization: { login: "org" } }));
      });
    });

    t.test("with installation account", (t) => {
      t.plan(1);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.match(event.user, { username: "account" });
        });

        log.fatal(event({ installation: { account: { login: "account" } } }));
      });
    });

    t.test("with repository owner", (t) => {
      t.plan(1);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.match(event.user, { username: "owner" });
        });

        log.fatal(event({ repository: { owner: { login: "owner" } } }));
      });
    });

    t.test("with repository owner and without installation", (t) => {
      t.plan(1);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.match(event.user, { username: "owner" });
        });

        log.fatal(
          event({
            installation: undefined,
            repository: { owner: { login: "owner" } },
          }),
        );
      });
    });

    t.test("with logFormat: json", (t) => {
      t.plan(1);

      const transform = getTransformStream({
        sentryDsn: "http://username@example.com/1234",
        logFormat: "json",
      });
      const log = pino({}, transform);

      withScope(function (scope) {
        scope.addEventProcessor(function (event, hint) {
          t.match(event.user, { username: "owner" });
        });

        log.fatal(event({ repository: { owner: { login: "owner" } } }));
      });
    });
  });
});
