import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import "reflect-metadata";
import { useExpressServer } from "routing-controllers";
import { getMetadataArgsStorage } from "routing-controllers";
import { routingControllersToSpec } from "routing-controllers-openapi";

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
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import appConfig from "./config";
import { swaggerSchemas, swaggerTags } from "./config/swagger-schemas";
import { routeConfig } from "./routes";
import { fixSwaggerMetadata } from "./utils/swagger-register";

/**
 * Import controllers (自动加载所有控制器)
 * tsx watch 会自动追踪所有被导入的文件，实现热更新
 */
import controllers from "./controllers/autoLoad/index";

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
         * 生产环境：dist/public
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
         * 使用 routing-controllers 注册装饰器控制器
         * 自动加载所有控制器（从 controllers/autoLoad/index.ts 导入）
         */
        useExpressServer(app, {
            routePrefix: routeConfig.apiPrefix,
            controllers: controllers,
            middlewares: [],
            interceptors: [],
            validation: {
                whitelist: true,
                forbidNonWhitelisted: true,
                skipMissingProperties: false,
            },
            defaultErrorHandler: false, // 使用自定义错误处理
        });

        /**
         * Swagger API 文档（使用 routing-controllers-openapi 生成）
         */
        if (appConfig.swagger.enabled) {
            try {
                const storage = getMetadataArgsStorage();
                
                // 修复 routing-controllers-openapi 库的 bug
                fixSwaggerMetadata(storage);
                
                const spec = routingControllersToSpec(storage, {
                    routePrefix: routeConfig.apiPrefix,
                    controllers: controllers, // 使用自动加载的控制器
                }, {
                    info: {
                        title: appConfig.swagger.title,
                        version: appConfig.swagger.version,
                        description: appConfig.swagger.description,
                        contact: appConfig.swagger.contact.name || appConfig.swagger.contact.email || appConfig.swagger.contact.url
                            ? {
                                name: appConfig.swagger.contact.name,
                                email: appConfig.swagger.contact.email,
                                url: appConfig.swagger.contact.url,
                              }
                            : undefined,
                    },
                    servers: appConfig.swagger.servers,
                    components: {
                        securitySchemes: {
                            bearerAuth: {
                                type: 'http',
                                scheme: 'bearer',
                                bearerFormat: 'JWT',
                                description: '输入 JWT 令牌，格式：Bearer {token}',
                            },
                        },
                        schemas: swaggerSchemas as any,
                    },
                    tags: swaggerTags as any,
                });

                app.use(
                    appConfig.swagger.path,
                    swaggerUi.serve,
                    swaggerUi.setup(spec, {
                        customCss: '.swagger-ui .topbar { display: none }',
                        customSiteTitle: appConfig.swagger.title,
                    })
                );
                console.log(`Swagger 文档已启用: http://localhost:${appConfig.app.port}${appConfig.swagger.path}`);
            } catch (error: any) {
                console.error('❌ Swagger 文档生成失败:', error.message);
                console.error('错误堆栈:', error.stack);
                // 不阻止服务器启动，但记录错误
            }
        }


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
            console.log("✅ 数据库初始化完成");
        } catch (err: any) {
            const errorMsg = err?.message || err?.code || '未知错误';
            console.error("❌ 数据库初始化失败:", errorMsg);
            // throw error;
        }

        /**
         * 初始化 Redis 连接
         */
        try {
            const redis = RedisClient.getInstance();
            await redis.connect();
            console.log("✅ Redis 初始化完成");
        } catch (err: any) {
            const errorMsg = err?.message || err?.code || '未知错误';
            console.error("❌ Redis 初始化失败:", errorMsg); 
            // Redis 连接失败不阻止服务器启动，但会记录错误
        }

        console.log(`✅ 服务器配置完成，环境: ${appConfig.app.env}`);

        console.log(`🎯 小游码匠 - Colyseus Server 🎯 `);
    }
});
