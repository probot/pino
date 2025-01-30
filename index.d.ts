import { Transform } from "node:stream";

type getTransformStream = (options?: Options) => Transform;

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Options = {
  logFormat?: "json" | "pretty";
  logLevelInString?: boolean;
  sentryDsn?: string;
};

export {
  getTransformStream
}