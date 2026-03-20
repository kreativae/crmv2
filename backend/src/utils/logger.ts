import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const levelColors: Record<LogLevel, string> = {
  debug: colors.gray,
  info: colors.green,
  warn: colors.yellow,
  error: colors.red,
};

const formatMessage = (level: LogLevel, message: string, ...args: unknown[]): string => {
  const timestamp = new Date().toISOString();
  const color = levelColors[level];
  const levelStr = level.toUpperCase().padEnd(5);
  
  let formattedArgs = '';
  if (args.length > 0) {
    formattedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return `\n${arg.stack || arg.message}`;
      }
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ');
  }
  
  if (env.isProd) {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(args.length > 0 && { data: args }),
    });
  }
  
  return `${colors.gray}${timestamp}${colors.reset} ${color}${levelStr}${colors.reset} ${message}${formattedArgs}`;
};

export const logger = {
  debug: (message: string, ...args: unknown[]): void => {
    if (env.isDev) {
      console.log(formatMessage('debug', message, ...args));
    }
  },
  
  info: (message: string, ...args: unknown[]): void => {
    console.log(formatMessage('info', message, ...args));
  },
  
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(formatMessage('warn', message, ...args));
  },
  
  error: (message: string, ...args: unknown[]): void => {
    console.error(formatMessage('error', message, ...args));
  },
};
