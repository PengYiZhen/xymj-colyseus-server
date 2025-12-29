/**
 * 生成 controllers/autoLoad/index.ts 文件
 * 用于构建时使用
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
 * ⚠️ 此文件由 scripts/generate-controllers.mjs 自动生成
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
    process.exit(1);
  }
}

// 生成一次后退出
generateIndexFile();

