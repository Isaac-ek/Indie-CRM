import pino from "pino";

let pinoInstance: pino.Logger | null = null;

try {
  pinoInstance = pino({
    level: process.env.LOG_LEVEL || "info",
    base: {
      env: process.env.NODE_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
} catch {
  pinoInstance = null;
}

export type LogContext = {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  [key: string]: unknown;
};

function formatJsonLog(level: string, message: string, context?: LogContext) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    env: process.env.NODE_ENV || "development",
    ...context,
    message,
  });
}

export function logInfo(message: string, context?: LogContext) {
  if (pinoInstance) {
    if (context) {
      pinoInstance.info(context, message);
    } else {
      pinoInstance.info(message);
    }
  } else {
    process.stdout.write(`${formatJsonLog("info", message, context)}\n`);
  }
}

export function logWarn(message: string, context?: LogContext) {
  if (pinoInstance) {
    if (context) {
      pinoInstance.warn(context, message);
    } else {
      pinoInstance.warn(message);
    }
  } else {
    process.stderr.write(`${formatJsonLog("warn", message, context)}\n`);
  }
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  const errObject =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error !== undefined
      ? { error }
      : {};

  if (pinoInstance) {
    pinoInstance.error({ ...errObject, ...context }, message);
  } else {
    process.stderr.write(
      `${formatJsonLog("error", message, { ...errObject, ...context })}\n`
    );
  }
}

export function createChildLogger(context: LogContext) {
  if (pinoInstance) {
    return pinoInstance.child(context);
  }
  return {
    info: (msg: string, ctx?: LogContext) => logInfo(msg, { ...context, ...ctx }),
    warn: (msg: string, ctx?: LogContext) => logWarn(msg, { ...context, ...ctx }),
    error: (msg: string, err?: unknown, ctx?: LogContext) => logError(msg, err, { ...context, ...ctx }),
  };
}
