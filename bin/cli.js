import pump from "pump";
import split from "split2";

import { getTransformStream } from "../index.js";

const options = {
  logFormat: process.env.LOG_FORMAT,
  logLevelInString: process.env.LOG_LEVEL_IN_STRING,
  sentryDsn: process.env.SENTRY_DSN,
};

pump(process.stdin, split(), await getTransformStream(options), process.stdout);
