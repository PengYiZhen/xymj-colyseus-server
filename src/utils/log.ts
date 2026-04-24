type LogLevel = "log" | "info" | "warn" | "error";

const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

function prefix(category: string) {
  const cat = category && String(category).trim() ? String(category).trim() : "系统";
  return `${BLUE}[xymj][${cat}]${RESET}`;
}

export function formatLogArgs(category: string, args: any[]) {
  // 保证 prefix 独立一个参数，避免影响原本对象打印
  return [prefix(category), ...args];
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
      // 允许调用方用 console.log("[数据库]", "xxx") 这种方式指定类别
      let category = defaultCategory;
      if (typeof args[0] === "string") {
        const m = args[0].match(/^\s*\[([^\]]+)\]\s*/);
        if (m) {
          category = m[1];
          args = [args[0].replace(m[0], ""), ...args.slice(1)];
          if (args[0] === "") args = args.slice(1);
        }
      }
      orig[level](...formatLogArgs(category, args));
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

