/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually
 * instantiate a Colyseus Server as documented here:
 *
 * See: https://docs.colyseus.io/server/api/#constructor-options
 */

// 必须在最顶部导入 reflect-metadata，TypeORM 需要它
import "reflect-metadata";

import { installConsolePrefix } from "./utils/log";
import { listen } from "@colyseus/tools";

// Import Colyseus config
import app from "./app.config";

// 统一控制台输出格式：[xymj][类别]，并用蓝色前缀显示
installConsolePrefix("系统");

// Create and listen on 2567 (or PORT environment variable.)
listen(app);
