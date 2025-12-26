/**
 * 开发环境启动脚本
 * 同时启动控制器监听和 tsx watch
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 启动开发服务器...\n');

// 启动控制器监听
const watchController = spawn('node', ['scripts/watch-controllers.mjs'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

// 启动 tsx watch
const tsxWatch = spawn('tsx', ['watch', '--ignore=src/public/**', 'src/index.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭开发服务器...');
  watchController.kill();
  tsxWatch.kill();
  process.exit(0);
});

// 处理子进程退出
watchController.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error('❌ 控制器监听进程异常退出');
  }
});

tsxWatch.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error('❌ tsx watch 进程异常退出');
    watchController.kill();
    process.exit(code || 1);
  }
});

