import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ReportService, GroupByOption } from '../services/report.service';

// Admin 權限驗證裝飾器（簡化版本，實際應使用 JWT Guard）
const AdminOnly = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // 這裡可以添加具體的權限驗證邏輯
    return descriptor;
  };
};

interface RevenueQueryDto {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupByOption;
}

interface DateRangeQueryDto {
  startDate?: string;
  endDate?: string;
}

interface PaginationQueryDto {
  limit?: number;
  offset?: number;
  creatorId?: string;
  startDate?: string;
  endDate?: string;
}

@Controller('api/payments/reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private reportService: ReportService) {}

  /**
   * 獲取營收報表
   * GET /api/payments/reports/revenue?startDate&endDate&groupBy
   */
  @Get('revenue')
  @AdminOnly()
  async getRevenueReport(@Query() query: RevenueQueryDto) {
    const { startDate, endDate, groupBy = 'day' } = query;

    const start = this.parseDate(startDate, this.getDefaultStartDate());
    const end = this.parseDate(endDate, new Date());

    this.validateDateRange(start, end);

    const data = await this.reportService.getRevenueReport(start, end, groupBy);

    return {
      success: true,
      data,
      meta: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        groupBy,
        totalPoints: data.length,
      },
    };
  }

  /**
   * 獲取交易統計
   * GET /api/payments/reports/transactions?startDate&endDate
   */
  @Get('transactions')
  @AdminOnly()
  async getTransactionStats(@Query() query: DateRangeQueryDto) {
    const { startDate, endDate } = query;

    const start = this.parseDate(startDate, this.getDefaultStartDate());
    const end = this.parseDate(endDate, new Date());

    this.validateDateRange(start, end);

    const data = await this.reportService.getTransactionStats(start, end);

    return {
      success: true,
      data,
      meta: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  /**
   * 獲取退款分析
   * GET /api/payments/reports/refunds?startDate&endDate
   */
  @Get('refunds')
  @AdminOnly()
  async getRefundAnalysis(@Query() query: DateRangeQueryDto) {
    const { startDate, endDate } = query;

    const start = this.parseDate(startDate, this.getDefaultStartDate());
    const end = this.parseDate(endDate, new Date());

    this.validateDateRange(start, end);

    const data = await this.reportService.getRefundAnalysis(start, end);

    return {
      success: true,
      data,
      meta: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  /**
   * 獲取創作者收益排行
   * GET /api/payments/reports/creator-earnings?limit&offset&creatorId&startDate&endDate
   */
  @Get('creator-earnings')
  @AdminOnly()
  async getCreatorEarnings(@Query() query: PaginationQueryDto) {
    const {
      limit = 20,
      offset = 0,
      creatorId,
      startDate,
      endDate,
    } = query;

    const start = startDate ? this.parseDate(startDate, undefined) : undefined;
    const end = endDate ? this.parseDate(endDate, undefined) : undefined;

    if (start && end) {
      this.validateDateRange(start, end);
    }

    const { creators, total } = await this.reportService.getCreatorEarnings(
      creatorId,
      start,
      end,
      Math.min(limit, 100), // 最大限制 100
      offset,
    );

    return {
      success: true,
      data: creators,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + creators.length < total,
      },
    };
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateString: string | undefined, defaultDate: Date | undefined): Date {
    if (!dateString) {
      if (!defaultDate) {
        throw new BadRequestException('Date is required');
      }
      return defaultDate;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date format: ${dateString}`);
    }
    return date;
  }

  /**
   * 驗證日期範圍
   */
  private validateDateRange(start: Date, end: Date): void {
    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end.getTime() - start.getTime() > maxRange) {
      throw new BadRequestException('Date range cannot exceed 1 year');
    }
  }

  /**
   * 獲取默認開始日期（30天前）
   */
  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }
}
