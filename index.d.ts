import { Transform } from "readable-stream";

export type Options = {
  logFormat?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  logLevelInString?: boolean;
  sentryDsn?: string;
};

export function getTransformStream(options?: Options): Transform;
