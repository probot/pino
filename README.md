# `@probot/pino`

> formats [pino](https://github.com/pinojs/pino) logs and sends them to [sentry](https://sentry.io)

## About

`@probot/pino` is currently built into `probot`, you don't need to manually pipe probot's logs into it. It will be easy to move it out of `probot` in future though, and give people a simple way to recover the logging behavior if they wish, or to replace it with another [pino transport](https://getpino.io/#/docs/transports)

## Options

`@probot/pino` can be configured using environment variables

| Variable              | Description                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_FORMAT`          | By default, logs are formatted for readability in development. You can set this to `json` in order to disable the formatting                                                                             |
| `LOG_LEVEL_IN_STRING` | By default, when using the `json` format, the level printed in the log records is an int (`10`, `20`, ..). This option tells the logger to print level as a string: `{"level": "info"}`. Default `false` |
| `SENTRY_DSN`          | Set to a [Sentry](https://sentry.io/) DSN to report all errors thrown by your app. <p>_(Example: `https://1234abcd@sentry.io/12345`)_</p>                                                                |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[ISC](LICENSE)
