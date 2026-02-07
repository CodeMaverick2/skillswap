// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
};

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, color, message) =>
  `${COLORS.gray}[${getTimestamp()}]${COLORS.reset} ${color}[${level}]${COLORS.reset} ${message}`;

const logger = {
  info: (message) => {
    console.log(formatMessage('INFO', COLORS.cyan, message));
  },
  warn: (message) => {
    console.warn(formatMessage('WARN', COLORS.yellow, message));
  },
  error: (message) => {
    console.error(formatMessage('ERROR', COLORS.red, message));
  },
  debug: (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', COLORS.gray, message));
    }
  },
};

module.exports = { logger };
