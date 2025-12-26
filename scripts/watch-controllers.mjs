/**
 * 监听 controllers 目录变化，自动更新 index.ts
 * 使用 Node.js 内置的 fs.watch，无需额外依赖
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const controllersDir = path.join(__dirname, '..', 'src', 'controllers');
const autoLoadDir = path.join(controllersDir, 'autoLoad');
const indexFile = path.join(autoLoadDir, 'index.ts');

/**
 * 生成 index.ts 文件
 */
function generateIndexFile() {
  try {
    // 读取所有控制器文件
    const files = fs.readdirSync(controllersDir);

    // 过滤出 Controller.ts 文件，排除 BaseController.ts、index.ts 和 autoLoad 目录
    const controllerFiles = files.filter(
      (file) => 
        file.endsWith('Controller.ts') && 
        file !== 'BaseController.ts' && 
        file !== 'index.ts' &&
        !file.startsWith('autoLoad')
    );

    // 生成导入语句（从 autoLoad 目录向上导入 controllers）
    const imports = controllerFiles.map(file => {
      const fileName = file.replace(/\.ts$/, '');
      return `import { ${fileName} } from '../${fileName}';`;
    }).join('\n');

    // 生成控制器数组
    const controllerArray = controllerFiles.map(file => {
      const fileName = file.replace(/\.ts$/, '');
      return `  ${fileName},`;
    }).join('\n');

    // 生成单独导出
    const exports = controllerFiles.map(file => {
      const fileName = file.replace(/\.ts$/, '');
      return fileName;
    }).join(', ');

    // 生成完整的 index.ts 内容
    const content = `/**
 * 自动导出所有控制器
 * ⚠️ 此文件由 scripts/watch-controllers.mjs 自动生成
 * 请勿手动修改！
 * 
 * 新增控制器时，只需在 controllers 目录下创建 *Controller.ts 文件
 * 此文件会自动更新
 */

${imports}

// 导出所有控制器的数组（用于 routing-controllers）
const controllers = [
${controllerArray}
];

export default controllers;

// 单独导出每个控制器（可选）
export { ${exports} };
`;

    // 确保 autoLoad 目录存在
    if (!fs.existsSync(autoLoadDir)) {
      fs.mkdirSync(autoLoadDir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(indexFile, content, 'utf8');
    console.log(`✅ [${new Date().toLocaleTimeString()}] 已更新 controllers/autoLoad/index.ts`);
    console.log(`📦 共找到 ${controllerFiles.length} 个控制器: ${controllerFiles.join(', ')}`);
  } catch (error) {
    console.error('❌ 生成 index.ts 失败:', error.message);
  }
}

// 初始生成一次
generateIndexFile();

// 监听 controllers 目录变化
console.log(`👀 正在监听 controllers 目录: ${controllersDir}`);

fs.watch(controllersDir, { recursive: false }, (eventType, filename) => {
  // 忽略 index.ts 和 autoLoad 目录的变化，避免循环更新
  if (filename === 'index.ts' || filename === 'autoLoad') {
    return;
  }

  // 只监听 Controller.ts 文件的变化
  if (filename && filename.endsWith('Controller.ts')) {
    console.log(`📝 检测到文件变化: ${filename} (${eventType})`);
    // 延迟一下，确保文件写入完成
    setTimeout(() => {
      generateIndexFile();
    }, 100);
  }
});

// 保持进程运行
process.on('SIGINT', () => {
  console.log('\n👋 停止监听 controllers 目录');
  process.exit(0);
});

