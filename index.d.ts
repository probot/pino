import { Transform } from "node:stream";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Options = {
  logFormat?: "json" | "pretty";
  logLevelInString?: boolean;
  sentryDsn?: string;
};

export function getTransformStream(options?: Options): Transform;
