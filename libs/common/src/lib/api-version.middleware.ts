import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import {
  ApiVersionConfig,
  DEFAULT_API_VERSION_CONFIG,
} from "./api-version.decorator";

/**
 * API 版本驗證中間件
 *
 * 功能：
 * 1. 驗證請求的 API 版本是否受支持
 * 2. 提取版本號並附加到 request 對象
 * 3. 對已棄用的版本發出警告
 */
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiVersionMiddleware.name);
  private config: ApiVersionConfig = DEFAULT_API_VERSION_CONFIG;

  constructor(config?: Partial<ApiVersionConfig>) {
    if (config) {
      this.config = { ...DEFAULT_API_VERSION_CONFIG, ...config };
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    let version: string | undefined;

    // 根據配置提取版本號
    switch (this.config.type) {
      case "uri":
        version = this.extractVersionFromUri(req.path);
        break;
      case "header":
        version = this.extractVersionFromHeader(req);
        break;
      case "query":
        version = this.extractVersionFromQuery(req);
        break;
    }

    // 如果未指定版本，使用預設版本
    if (!version) {
      version = this.config.defaultVersion;
    }

    // 驗證版本是否受支持
    if (!this.config.supportedVersions.includes(version)) {
      throw new BadRequestException(
        `API version '${version}' is not supported. Supported versions: ${this.config.supportedVersions.join(", ")}`,
      );
    }

    // 檢查版本是否已棄用
    if (this.config.deprecatedVersions?.includes(version)) {
      this.logger.warn(
        `API version '${version}' is deprecated. Please upgrade to version ${this.config.defaultVersion}.`,
      );
      res.setHeader("X-API-Deprecated", "true");
      res.setHeader(
        "X-API-Deprecation-Info",
        `Version ${version} is deprecated. Please upgrade to ${this.config.defaultVersion}.`,
      );
    }

    // 將版本號附加到 request 對象
    (req as any).apiVersion = version;

    // 添加版本號到響應頭
    res.setHeader("X-API-Version", version);

    next();
  }

  /**
   * 從 URI 中提取版本號
   * 例如：/v1/users -> '1'
   */
  private extractVersionFromUri(path: string): string | undefined {
    const match = path.match(/^\/v(\d+)\//);
    return match ? match[1] : undefined;
  }

  /**
   * 從 Header 中提取版本號
   */
  private extractVersionFromHeader(req: Request): string | undefined {
    const headerName = this.config.header || "X-API-Version";
    return req.get(headerName);
  }

  /**
   * 從查詢參數中提取版本號
   * 例如：/users?version=1 -> '1'
   */
  private extractVersionFromQuery(req: Request): string | undefined {
    return req.query['version'] as string;
  }
}
