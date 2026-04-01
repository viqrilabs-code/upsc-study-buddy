import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactContext(context: LogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}

function serializeError(error: unknown): SerializedError | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

function getTraceIdFromRequest(request?: Request | null) {
  const cloudTraceHeader = request?.headers.get("x-cloud-trace-context") || "";
  if (cloudTraceHeader) {
    return cloudTraceHeader.split("/")[0] || randomUUID();
  }

  const requestIdHeader = request?.headers.get("x-request-id") || "";
  if (requestIdHeader) {
    return requestIdHeader;
  }

  const traceParentHeader = request?.headers.get("traceparent") || "";
  if (traceParentHeader) {
    return traceParentHeader.split("-")[1] || traceParentHeader;
  }

  if (!cloudTraceHeader && !requestIdHeader && !traceParentHeader) {
    return randomUUID();
  }

  return randomUUID();
}

function writeLog(level: LogLevel, event: string, context?: LogContext, error?: unknown) {
  const payload = compactContext({
    severity: level.toUpperCase(),
    event,
    service: "tamgam-web",
    environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    ...compactContext(context),
    error: serializeError(error),
  });

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logInfo(event: string, context?: LogContext) {
  writeLog("info", event, context);
}

export function logWarn(event: string, context?: LogContext, error?: unknown) {
  writeLog("warn", event, context, error);
}

export function logError(event: string, error?: unknown, context?: LogContext) {
  writeLog("error", event, context, error);
}

export function createRequestLogger(route: string, request?: Request | null) {
  const requestId = getTraceIdFromRequest(request);
  const pathname = request ? new URL(request.url).pathname : route;
  const method = request?.method || "UNKNOWN";
  const baseContext = {
    route,
    path: pathname,
    method,
    requestId,
  };

  return {
    requestId,
    info(event: string, context?: LogContext) {
      logInfo(event, {
        ...baseContext,
        ...compactContext(context),
      });
    },
    warn(event: string, context?: LogContext, error?: unknown) {
      logWarn(
        event,
        {
          ...baseContext,
          ...compactContext(context),
        },
        error,
      );
    },
    error(event: string, error?: unknown, context?: LogContext) {
      logError(event, error, {
        ...baseContext,
        ...compactContext(context),
      });
    },
    child(extraContext?: LogContext) {
      const merged = compactContext({
        ...baseContext,
        ...(isRecord(extraContext) ? extraContext : {}),
      });

      return {
        requestId,
        info(event: string, context?: LogContext) {
          logInfo(event, { ...merged, ...compactContext(context) });
        },
        warn(event: string, context?: LogContext, error?: unknown) {
          logWarn(event, { ...merged, ...compactContext(context) }, error);
        },
        error(event: string, error?: unknown, context?: LogContext) {
          logError(event, error, { ...merged, ...compactContext(context) });
        },
      };
    },
  };
}
