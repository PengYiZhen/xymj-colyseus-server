import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// 读取根目录的 package.json
const rootPackageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// 创建生产环境的 package.json，只包含必要的字段
const distPackageJson = {
  name: rootPackageJson.name,
  version: rootPackageJson.version,
  description: rootPackageJson.description,
  main: 'index.js', // 修正 main 路径，因为文件已经在 dist 目录中
  engines: rootPackageJson.engines,
  private: rootPackageJson.private,
  dependencies: rootPackageJson.dependencies,
  // 不包含 devDependencies 和 scripts（生产环境不需要）
};

// 写入 dist/package.json
const distPath = join('dist', 'package.json');
writeFileSync(distPath, JSON.stringify(distPackageJson, null, 2) + '\n', 'utf8');

