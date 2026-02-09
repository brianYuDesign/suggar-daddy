import { All, Req, Res, Controller, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway' };
  }

  /** 代理所有其他請求到對應微服務 */
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path || (req.url ? req.url.split('?')[0] : '') || '/';
    const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '';
    const headers: Record<string, string> = {};
    const auth = req.headers['authorization'];
    if (auth) headers['authorization'] = Array.isArray(auth) ? auth[0] : auth;
    const ct = req.headers['content-type'];
    if (ct) headers['content-type'] = Array.isArray(ct) ? ct[0] : ct;
    const { status, data, headers: resHeaders } = await this.proxy.forward(
      req.method,
      path,
      query,
      headers,
      req.body
    );
    res.status(status);
    Object.entries(resHeaders).forEach(([k, v]) => res.setHeader(k, v));
    if (data !== undefined) res.json(data);
    else res.end();
  }
}
