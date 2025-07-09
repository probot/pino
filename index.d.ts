import { Transform } from "node:stream";

declare function getTransformStream(options?: Options): Promise<Transform>;

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Options = {
  logFormat?: "json" | "pretty";
  logLevelInString?: boolean;
  sentryDsn?: string;
};

export {
  getTransformStream
}
