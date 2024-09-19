import { Transform } from "node:stream";

type getTransformStream = (options?: getTransformStream.Options) => Transform;

declare namespace getTransformStream {
  export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

  export type Options = {
    logFormat?: "json" | "pretty";
    logLevelInString?: boolean;
    sentryDsn?: string;
  };

  export const getTransformStream: getTransformStream
  export { getTransformStream as default }
}

declare function getTransformStream(...params: Parameters<getTransformStream>): ReturnType<getTransformStream>

export = getTransformStream
