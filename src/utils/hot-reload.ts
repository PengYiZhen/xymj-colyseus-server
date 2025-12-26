/**
 * 热更新工具
 * 确保所有模块在开发环境下能够正确热更新
 */

if (process.env.NODE_ENV === 'development') {
  // 在开发环境下，清除 require 缓存以确保热更新
  const originalRequire = require;
  
  // 监听文件变化，清除缓存
  if (typeof require.cache !== 'undefined') {
    // 这个文件会在每次文件变化时被重新执行
    // tsx watch 会自动处理大部分情况
    // 但我们可以在这里添加额外的清理逻辑
  }
}

/**
 * 清除指定模块的缓存（用于强制重新加载）
 */
export function clearModuleCache(modulePath: string): void {
  if (typeof require !== 'undefined' && require.cache) {
    const resolvedPath = require.resolve(modulePath);
    delete require.cache[resolvedPath];
  }
}

/**
 * 清除所有控制器模块的缓存
 */
export function clearControllerCache(): void {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('controllers') && key.endsWith('.ts')) {
        delete require.cache[key];
      }
    });
  }
}

