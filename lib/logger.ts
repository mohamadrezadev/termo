export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

let currentLevel: LogLevel = 'info';
const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined;
if (envLevel && envLevel in levelOrder) {
  currentLevel = envLevel;
}

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function format(level: LogLevel, message: unknown[]) {
  const prefix = `[${level.toUpperCase()}]`;
  return [prefix, ...message];
}

export const logger = {
  setLevel(level: LogLevel) {
    if (level in levelOrder) {
      currentLevel = level;
    }
  },
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(...format('debug', args));
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.info(...format('info', args));
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...format('warn', args));
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...format('error', args));
  }
};

export default logger;
