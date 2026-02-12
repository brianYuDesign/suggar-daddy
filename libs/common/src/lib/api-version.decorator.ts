import { SetMetadata } from "@nestjs/common";

/**
 * API 版本控制常數
 */
export const API_VERSION_METADATA_KEY = "api_version";

/**
 * API 版本裝飾器
 *
 * 用於標記 Controller 或 Route 的 API 版本
 *
 * @example
 * ```typescript
 * @Controller('users')
 * @ApiVersion('1')
 * export class UsersV1Controller {
 *   @Get()
 *   findAll() {
 *     return this.userService.findAll();
 *   }
 * }
 *
 * @Controller('users')
 * @ApiVersion('2')
 * export class UsersV2Controller {
 *   @Get()
 *   findAll() {
 *     return this.userService.findAllV2();
 *   }
 * }
 * ```
 */
export const ApiVersion = (version: string) =>
  SetMetadata(API_VERSION_METADATA_KEY, version);

/**
 * API 版本枚舉
 */
export enum ApiVersionEnum {
  V1 = "1",
  V2 = "2",
}

/**
 * API 版本配置接口
 */
export interface ApiVersionConfig {
  /** 預設版本 */
  defaultVersion: string;
  /** 支持的版本列表 */
  supportedVersions: string[];
  /** 已棄用的版本列表 */
  deprecatedVersions?: string[];
  /** 版本提取方式 */
  type: "uri" | "header" | "query";
  /** Header 名稱（當 type 為 'header' 時） */
  header?: string;
}

/**
 * 預設 API 版本配置
 */
export const DEFAULT_API_VERSION_CONFIG: ApiVersionConfig = {
  defaultVersion: "1",
  supportedVersions: ["1", "2"],
  deprecatedVersions: [],
  type: "uri", // 使用 URI 版本控制（例如：/v1/users）
  header: "X-API-Version",
};
