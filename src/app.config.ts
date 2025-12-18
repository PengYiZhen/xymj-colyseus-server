import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import "reflect-metadata";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom";
import { GameRoom } from "./rooms/GameRoom";

/**
 * Import database and cache
 */
import { createConnection } from "./database/connection";
import RedisClient from "./utils/redis";

/**
 * Import routes and middleware
 */
import routes from "./routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import appConfig from "./config";
import { swaggerSpec } from "./config/swagger";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('my_room', MyRoom);
        
        /**
         * 帧同步游戏房间
         */
        gameServer.define('game_room', GameRoom, {
            fps: 20, // 帧率
            recordFrames: false, // 是否记录帧数据
        });
    },

    initializeExpress: (app) => {
        /**
         * 静态文件服务（提供 public 目录下的文件）
         * 开发环境：src/public
         * 生产环境：build/public
         */
        const isDev = appConfig.app.env === 'development';
        const publicPath = isDev 
            ? path.join(process.cwd(), 'src', 'public')
            : path.join(__dirname, 'public');
        
        app.use(express.static(publicPath));
        
        /**
         * 根路径返回 index.html（仅在非开发环境，开发环境由 playground 处理）
         */
        if (process.env.NODE_ENV === "production") {
            app.get('/', (req, res) => {
                res.sendFile(path.join(publicPath, 'index.html'));
            });
        }

        /**
         * 解析 JSON 请求体
         */
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        /**
         * Swagger API 文档
         */
        if (appConfig.swagger.enabled) {
            app.use(
                appConfig.swagger.path,
                swaggerUi.serve,
                swaggerUi.setup(swaggerSpec, {
                    customCss: '.swagger-ui .topbar { display: none }',
                    customSiteTitle: appConfig.swagger.title,
                })
            );
            console.log(`Swagger 文档已启用: http://localhost:${appConfig.app.port}${appConfig.swagger.path}`);
        }

        /**
         * API 路由
         */
        app.use("/api", routes);

        /**
         * 健康检查端点
         */
        /**
         * @swagger
         * /health:
         *   get:
         *     tags: [健康检查]
         *     summary: 健康检查
         *     description: 检查服务运行状态
         *     responses:
         *       200:
         *         description: 服务运行正常
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                   example: true
         *                 message:
         *                   type: string
         *                   example: 服务运行正常
         *                 timestamp:
         *                   type: string
         *                   format: date-time
         *                 version:
         *                   type: string
         *                   example: 1.0.0
         */
        app.get("/health", (req, res) => {
            res.json({
                success: true,
                message: "服务运行正常",
                timestamp: new Date().toISOString(),
                version: appConfig.app.version,
            });
        });

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", monitor());

        /**
         * 404 处理（必须在所有路由之后）
         */
        app.use(notFoundMiddleware);

        /**
         * 错误处理中间件（必须在最后）
         */
        app.use(errorMiddleware);
    },

    beforeListen: async () => {
        /**
         * 初始化数据库连接
         */
        try {
            await createConnection();
            console.log("数据库初始化完成");
        } catch (error) {
            console.error("数据库初始化失败:", error);
            throw error;
        }

        /**
         * 初始化 Redis 连接
         */
        try {
            const redis = RedisClient.getInstance();
            await redis.connect();
            console.log("Redis 初始化完成");
        } catch (error) {
            console.error("Redis 初始化失败:", error); 
            // Redis 连接失败不阻止服务器启动，但会记录错误
        }

        console.log(`服务器配置完成，环境: ${appConfig.app.env}`);
    }
});
