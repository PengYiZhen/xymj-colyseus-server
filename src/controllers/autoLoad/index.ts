/**
 * 自动导出所有控制器
 * ⚠️ 此文件由 scripts/watch-controllers.mjs 自动生成
 * 请勿手动修改！
 * 
 * 新增控制器时，只需在 controllers 目录下创建 *Controller.ts 文件
 * 此文件会自动更新
 */

import { AuthController } from '../AuthController';
import { HealthController } from '../HealthController';
import { HelloWorldController } from '../HelloWorldController';

// 导出所有控制器的数组（用于 routing-controllers）
const controllers = [
  AuthController,
  HealthController,
  HelloWorldController,
];

export default controllers;

// 单独导出每个控制器（可选）
export { AuthController, HealthController, HelloWorldController };
