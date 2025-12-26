/**
 * 自动生成 controllers/index.ts
 * 扫描 controllers 目录下的所有 Controller.ts 文件并自动生成导入语句
 * 
 * 使用方法：
 * - 开发时：可以手动运行 `node scripts/auto-import-controllers.js`
 * - 或者使用 chokidar 等工具监听文件变化自动运行
 */

// 使用 CommonJS 格式
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '..', 'src', 'controllers');
const indexFile = path.join(controllersDir, 'index.ts');

// 读取所有控制器文件
const files = fs.readdirSync(controllersDir);

// 过滤出 Controller.ts 文件，排除 BaseController.ts 和 index.ts
const controllerFiles = files.filter(
  (file) => 
    file.endsWith('Controller.ts') && 
    file !== 'BaseController.ts' && 
    file !== 'index.ts'
);

// 生成导入语句
const imports = controllerFiles.map(file => {
  const fileName = file.replace(/\.ts$/, '');
  return `import { ${fileName} } from './${fileName}';`;
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
 * ⚠️ 此文件由 scripts/auto-import-controllers.js 自动生成
 * 请勿手动修改！如需修改，请运行: node scripts/auto-import-controllers.js
 * 
 * 新增控制器时，只需在 controllers 目录下创建 *Controller.ts 文件
 * 然后运行上述脚本即可自动更新此文件
 */

${imports}

// 导出所有控制器的数组（用于 routing-controllers）
const controllers = [
${controllerArray}
];

export default controllers;

// 单独导出每个控制器（可选，方便其他地方单独导入）
export { ${exports} };
`;

// 写入文件
fs.writeFileSync(indexFile, content, 'utf8');
console.log('✅ 已自动生成 controllers/index.ts');
console.log(`📦 共找到 ${controllerFiles.length} 个控制器:`, controllerFiles.join(', '));

