type LogLevel = "log" | "info" | "warn" | "error";

const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/** 前缀固定蓝色；仅 error/warn 的正文另行着色 */
function prefix(category: string) {
  const cat = category && String(category).trim() ? String(category).trim() : "系统";
  return `${BLUE}[xymj][${cat}]${RESET}`;
}

function colorizeArgs(level: LogLevel, args: any[]): any[] {
  if (level === "log" || level === "info") return args;

  const color = level === "error" ? RED : YELLOW;
  return args.map((arg) => {
    if (arg instanceof Error) {
      return `${color}${arg.stack ?? arg.message}${RESET}`;
    }
    if (typeof arg === "string") {
      return `${color}${arg}${RESET}`;
    }
    return arg;
  });
}

export function formatLogArgs(category: string, args: any[], level: LogLevel = "log") {
  return [prefix(category), ...colorizeArgs(level, args)];
}

export function installConsolePrefix(defaultCategory = "系统") {
  const orig: Record<LogLevel, (...args: any[]) => void> = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const wrap =
    (level: LogLevel) =>
    (...args: any[]) => {
      let category = defaultCategory;
      if (typeof args[0] === "string") {
        const m = args[0].match(/^\s*\[([^\]]+)\]\s*/);
        if (m) {
          category = m[1];
          args = [args[0].replace(m[0], ""), ...args.slice(1)];
          if (args[0] === "") args = args.slice(1);
        }
      }
      orig[level](...formatLogArgs(category, args, level));
    };

  console.log = wrap("log") as any;
  console.info = wrap("info") as any;
  console.warn = wrap("warn") as any;
  console.error = wrap("error") as any;

  return () => {
    console.log = orig.log as any;
    console.info = orig.info as any;
    console.warn = orig.warn as any;
    console.error = orig.error as any;
  };
}
