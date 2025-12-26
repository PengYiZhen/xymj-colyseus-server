import path from 'path';
import fs from 'fs';

/**
 * 自动加载所有控制器
 * 扫描 src/controllers 目录下所有以 Controller.ts 结尾的文件（排除 BaseController.ts）
 */
export function loadControllers(): Function[] {
  const controllers: Function[] = [];
  
  // 获取 controllers 目录路径
  const controllersDir = path.join(process.cwd(), 'src', 'controllers');
  
  // 检查目录是否存在
  if (!fs.existsSync(controllersDir)) {
    console.warn('⚠️  Controllers 目录不存在:', controllersDir);
    return controllers;
  }

  try {
    // 读取目录下的所有文件
    const files = fs.readdirSync(controllersDir);
    
    // 过滤出 Controller.ts 文件，排除 BaseController.ts
    const controllerFiles = files.filter(
      (file) => file.endsWith('Controller.ts') && file !== 'BaseController.ts'
    );

    for (const file of controllerFiles) {
      try {
        // 构建相对路径：从当前文件（utils）到 controllers 目录
        // ../controllers/AuthController
        const fileName = file.replace(/\.ts$/, '');
        const modulePath = `../controllers/${fileName}`;

        // 使用 require 动态加载（tsx 运行时可直接加载 .ts）
        const module = require(modulePath);
        
        // 查找导出的控制器类（查找所有以 Controller 结尾的导出）
        const controllerClass = Object.values(module).find(
          (exported: any) =>
            typeof exported === 'function' &&
            exported.name.endsWith('Controller') &&
            exported.prototype !== undefined
        ) as Function | undefined;

        if (controllerClass) {
          controllers.push(controllerClass);
          console.log(`✅ 已加载控制器: ${file}`);
        } else {
          console.warn(`⚠️  未找到控制器类: ${file}`);
        }
      } catch (error: any) {
        console.error(`❌ 加载控制器失败 ${file}:`, error.message);
      }
    }

    if (controllers.length > 0) {
      console.log(`📦 共加载 ${controllers.length} 个控制器`);
    }
    return controllers;
  } catch (error: any) {
    console.error('❌ 扫描控制器目录失败:', error.message);
    return controllers;
  }
}

