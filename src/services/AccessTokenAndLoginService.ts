import axios from "axios";
import { DouYinConfig, WeiXinConfig } from "../config/minigame";
import RedisClient from "../utils/redis";

export interface AccessToken {
    access_token: string;
    expires_in: number;
    expires_at?: number; // 过期时间戳（秒）
}

interface CachedToken extends AccessToken {
    cached_at: number; // 缓存时间戳（秒）
}

/**
 * 抖音 code2Session 接口响应数据
 */
export interface DouYinCode2SessionResponse {
    error: number; // 错误号，0 表示成功
    openid?: string; // 用户在当前小游戏的 ID（如果有 code 参数）
    session_key?: string; // 会话密钥（如果有 code 参数）
    anonymous_openid?: string; // 匿名用户在当前小游戏的 ID（如果有 anonymous_code 参数）
    unionid?: string; // 用户在小游戏平台的唯一标识符（如果有 code 参数）
    errcode?: number; // 详细错误号
    errmsg?: string; // 错误信息
    message?: string; // 错误信息（同 errmsg）
}

/**
 * 微信 code2Session 接口响应数据
 */
export interface WeiXinCode2SessionResponse {
    openid?: string; // 用户唯一标识
    session_key?: string; // 会话密钥
    unionid?: string; // 用户在开放平台的唯一标识符
    errcode?: number; // 错误码，0 表示成功
    errmsg?: string; // 错误信息
}

/**
 * @令牌和登录相关服务
 */
export class AccessTokenAndLoginService {

    public douyinAccessTokenUrl: string;
    public weixinAccessTokenUrl: string;
    public douyinLoginUrl: string;
    public weixinLoginUrl: string;
    private redis: RedisClient;
    private readonly DOUYIN_TOKEN_KEY = "douyin_access_token";
    private readonly WEIXIN_TOKEN_KEY = "weixin_access_token";

    constructor() {
        this.douyinAccessTokenUrl = `https://minigame.zijieapi.com/mgplatform/api/apps/v2/token`;
        this.douyinLoginUrl = `https://minigame.zijieapi.com/mgplatform/api/apps/jscode2session`;
        this.weixinAccessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token`;
        this.weixinLoginUrl = "https://api.weixin.qq.com/sns/jscode2session";
        this.redis = RedisClient.getInstance();
    }

    /**
     * 从服务器获取抖音 Access Token
     */
    private async fetchDouYinAccessTokenFromServer(): Promise<AccessToken> {
        try {
            const response = await axios.post(this.douyinAccessTokenUrl, {
                appid: DouYinConfig.AppID,
                secret: DouYinConfig.AppSecret,
                grant_type: "client_credential"
            }, {
                headers: {
                    "content-type": "application/json"
                }
            });

            if (response.data.err_no !== 0) {
                throw new Error(`获取抖音 Access Token 失败: ${response.data.err_tips || '未知错误'}`);
            }

            const tokenData = response.data.data;
            return {
                access_token: tokenData.access_token,
                expires_in: tokenData.expires_in,
                expires_at: tokenData.expires_at
            };
        } catch (error: any) {
            throw new Error(`获取抖音 Access Token 异常: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 获取抖音 Access Token（带 Redis 缓存）
     * 如果缓存未过期则从 Redis 获取，否则从服务器获取并更新缓存
     */
    public async getDouYinAccessToken(): Promise<AccessToken> {
        try {
            // 尝试从 Redis 获取缓存的 token
            const cachedToken = await this.redis.get<CachedToken>(this.DOUYIN_TOKEN_KEY);
            
            if (cachedToken) {
                const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
                const cachedTime = cachedToken.cached_at || 0;
                const elapsed = now - cachedTime; // 已过时间（秒）
                
                // 如果未过期（剩余时间大于 0），直接返回缓存的 token
                if (elapsed < cachedToken.expires_in) {
                    return {
                        access_token: cachedToken.access_token,
                        expires_in: cachedToken.expires_in - elapsed, // 返回剩余有效时间
                        expires_at: cachedToken.expires_at
                    };
                }
            }

            // 缓存不存在或已过期，从服务器获取新 token
            const newToken = await this.fetchDouYinAccessTokenFromServer();
            
            // 存储到 Redis，设置过期时间（比实际过期时间稍短，提前 60 秒过期以确保安全）
            const cacheData: CachedToken = {
                ...newToken,
                cached_at: Math.floor(Date.now() / 1000)
            };
            
            // 设置过期时间，使用 expires_in - 60 秒作为缓冲
            const expireSeconds = Math.max(newToken.expires_in - 60, 60);
            await this.redis.set(this.DOUYIN_TOKEN_KEY, cacheData, expireSeconds);
            
            return newToken;
        } catch (error: any) {
            throw new Error(`获取抖音 Access Token 失败: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 获取抖音登录用户信息（openid、session_key 等）
     * @param code 登录凭证（非匿名登录）
     * @param anonymousCode 匿名登录凭证（匿名登录）
     * @returns 用户信息，包括 openid、session_key、unionid 等
     */
    public async getDouYinLoginUserInfoOpenid(
        code: string,
        anonymousCode?: string
    ): Promise<DouYinCode2SessionResponse> {
        try {
            // code 和 anonymous_code 至少要有一个
            if (!code && !anonymousCode) {
                throw new Error("code 和 anonymous_code 至少要提供一个");
            }

            const url = this.douyinLoginUrl;
            
            const params: Record<string, string> = {
                appid: DouYinConfig.AppID,
                secret: DouYinConfig.AppSecret
            };

            if (code) {
                params.code = code;
            }
            if (anonymousCode) {
                params.anonymous_code = anonymousCode;
            }

            const response = await axios.get(url, {
                params,
                headers: {
                    "content-type": "application/json"
                }
            });

            // 检查错误
            if (response.data.error !== 0) {
                const errorMsg = response.data.errmsg || response.data.message || '未知错误';
                const errorCode = response.data.errcode || response.data.error;
                throw new Error(`获取抖音用户信息失败: ${errorMsg} (error: ${errorCode})`);
            }

            return {
                error: response.data.error,
                openid: response.data.openid,
                session_key: response.data.session_key,
                anonymous_openid: response.data.anonymous_openid,
                unionid: response.data.unionid,
                errcode: response.data.errcode,
                errmsg: response.data.errmsg,
                message: response.data.message
            };
        } catch (error: any) {
            throw new Error(`获取抖音用户信息异常: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 获取微信登录用户信息（openid、session_key 等）
     * @param jsCode 登录时获取的 code（通过 wx.login 接口获得）
     * @returns 用户信息，包括 openid、session_key、unionid 等
     */
    public async getWeixinLoginUserInfoOpenid(
        jsCode: string
    ): Promise<WeiXinCode2SessionResponse> {
        try {
            if (!jsCode) {
                throw new Error("js_code 参数不能为空");
            }

            const response = await axios.get(this.weixinLoginUrl, {
                params: {
                    appid: WeiXinConfig.AppID,
                    secret: WeiXinConfig.AppSecret,
                    js_code: jsCode,
                    grant_type: "authorization_code"
                }
            });

            // 检查错误
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`获取微信用户信息失败: ${response.data.errmsg || '未知错误'} (errcode: ${response.data.errcode})`);
            }

            return {
                openid: response.data.openid,
                session_key: response.data.session_key,
                unionid: response.data.unionid,
                errcode: response.data.errcode,
                errmsg: response.data.errmsg
            };
        } catch (error: any) {
            throw new Error(`获取微信用户信息异常: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 从服务器获取微信 Access Token
     */
    private async fetchWeixinAccessTokenFromServer(): Promise<AccessToken> {
        try {
            const response = await axios.get(this.weixinAccessTokenUrl, {
                params: {
                    grant_type: "client_credential",
                    appid: WeiXinConfig.AppID,
                    secret: WeiXinConfig.AppSecret
                }
            });

            // 微信接口错误时返回 errcode 和 errmsg
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`获取微信 Access Token 失败: ${response.data.errmsg || '未知错误'} (errcode: ${response.data.errcode})`);
            }

            // 正常返回 access_token 和 expires_in
            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in
            };
        } catch (error: any) {
            throw new Error(`获取微信 Access Token 异常: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 获取微信 Access Token（带 Redis 缓存）
     * 如果缓存未过期则从 Redis 获取，否则从服务器获取并更新缓存
     */
    public async getWeixinAccessToken(): Promise<AccessToken> {
        try {
            // 尝试从 Redis 获取缓存的 token
            const cachedToken = await this.redis.get<CachedToken>(this.WEIXIN_TOKEN_KEY);
            
            if (cachedToken) {
                const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
                const cachedTime = cachedToken.cached_at || 0;
                const elapsed = now - cachedTime; // 已过时间（秒）
                
                // 如果未过期（剩余时间大于 0），直接返回缓存的 token
                if (elapsed < cachedToken.expires_in) {
                    return {
                        access_token: cachedToken.access_token,
                        expires_in: cachedToken.expires_in - elapsed, // 返回剩余有效时间
                        expires_at: cachedToken.expires_at
                    };
                }
            }

            // 缓存不存在或已过期，从服务器获取新 token
            const newToken = await this.fetchWeixinAccessTokenFromServer();
            
            // 存储到 Redis，设置过期时间（比实际过期时间稍短，提前 60 秒过期以确保安全）
            const cacheData: CachedToken = {
                ...newToken,
                cached_at: Math.floor(Date.now() / 1000)
            };
            
            // 设置过期时间，使用 expires_in - 60 秒作为缓冲
            const expireSeconds = Math.max(newToken.expires_in - 60, 60);
            await this.redis.set(this.WEIXIN_TOKEN_KEY, cacheData, expireSeconds);
            
            return newToken;
        } catch (error: any) {
            throw new Error(`获取微信 Access Token 失败: ${error.message || '未知错误'}`);
        }
    }
}