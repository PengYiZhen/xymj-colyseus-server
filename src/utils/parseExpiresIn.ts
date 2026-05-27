/**
 * 将 JWT 过期时间字符串转为 Redis TTL 用的秒数。
 * 支持：纯数字秒数、`1h`、`24h`、`7d` 等（与 jsonwebtoken expiresIn 常见写法一致）。
 */
export function parseExpiresInToSeconds(expiresIn: string): number {
  const raw = expiresIn?.trim();
  if (!raw) return 3600;

  if (/^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }

  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 3600;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 3600;
  }
}
