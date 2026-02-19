import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { CreateInvoiceDto, SendInvoiceDto } from '../dtos/invoice.dto';
import { ConfigService } from './config.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private configService: ConfigService,
  ) {}

  /**
   * 生成發票編號
   */
  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.invoiceRepository.count();
    const timestamp = Date.now().toString().slice(-4);
    return `INV-2026-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * 創建發票
   */
  async createInvoice(dto: CreateInvoiceDto) {
    this.logger.log(`Creating invoice for user ${dto.userId}`);

    try {
      // 計算總額
      const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const tax = subtotal * 0.1; // 假設 10% 稅率
      const total = subtotal + tax;

      const invoiceNumber = await this.generateInvoiceNumber();

      // 設置到期日期（30 天後）
      const dueDate = dto.dueDate || new Date();
      if (!dto.dueDate) {
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const invoice = this.invoiceRepository.create({
        userId: dto.userId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber,
        subtotal,
        tax,
        total,
        currency: 'USD',
        items: dto.items.map(item => ({
          ...item,
          amount: item.quantity * item.unitPrice,
        })),
        dueDate,
        status: InvoiceStatus.DRAFT,
        metadata: dto.metadata,
      });

      const savedInvoice = await this.invoiceRepository.save(invoice);
      this.logger.log(`Invoice created: ${savedInvoice.id}`);

      return {
        id: savedInvoice.id,
        invoiceNumber: savedInvoice.invoiceNumber,
        status: savedInvoice.status,
        total: savedInvoice.total,
        dueDate: savedInvoice.dueDate,
      };
    } catch (error) {
      this.logger.error(`Invoice creation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 發送發票
   */
  async sendInvoice(dto: SendInvoiceDto) {
    this.logger.log(`Sending invoice ${dto.invoiceId} to ${dto.email}`);

    try {
      const invoice = await this.invoiceRepository.findOneBy({ id: dto.invoiceId });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // 生成 PDF（這裡使用模擬實現）
      const pdfUrl = await this.generateInvoicePdf(invoice);

      // 發送郵件（使用 SendGrid API）
      await this.sendInvoiceEmail(dto.email, invoice, pdfUrl);

      invoice.status = InvoiceStatus.ISSUED;
      invoice.sentAt = new Date();
      if (!invoice.s3Url) {
        invoice.s3Url = pdfUrl;
      }
      await this.invoiceRepository.save(invoice);

      return {
        id: invoice.id,
        status: invoice.status,
        sentAt: invoice.sentAt,
      };
    } catch (error) {
      this.logger.error(`Send invoice failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 標記發票為已支付
   */
  async markAsPaid(invoiceId: string) {
    this.logger.log(`Marking invoice ${invoiceId} as paid`);

    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidDate = new Date();
    await this.invoiceRepository.save(invoice);

    return invoice;
  }

  /**
   * 獲取發票詳情
   */
  async getInvoice(invoiceId: string) {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  /**
   * 獲取用戶的發票列表
   */
  async getUserInvoices(userId: string, limit: number = 20, offset: number = 0) {
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      invoices,
      total,
      limit,
      offset,
    };
  }

  /**
   * 取消發票
   */
  async cancelInvoice(invoiceId: string) {
    this.logger.log(`Cancelling invoice ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel paid invoice');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    await this.invoiceRepository.save(invoice);

    return invoice;
  }

  /**
   * 生成 PDF（模擬實現）
   */
  private async generateInvoicePdf(invoice: Invoice): Promise<string> {
    // 在實際應用中，這裡會使用 pdf-lib 或 pdfkit 生成 PDF
    // 然後上傳到 AWS S3
    this.logger.log(`Generating PDF for invoice ${invoice.id}`);

    // 模擬 S3 URL
    return `https://s3.amazonaws.com/${this.configService.getAwsS3Bucket()}/invoices/${invoice.id}.pdf`;
  }

  /**
   * 發送郵件（模擬實現）
   */
  private async sendInvoiceEmail(email: string, invoice: Invoice, pdfUrl: string): Promise<void> {
    // 在實際應用中，這裡會使用 SendGrid API 發送郵件
    this.logger.log(`Sending email to ${email} with invoice ${invoice.id}`);

    // 模擬郵件發送
    const emailBody = `
      Dear Customer,
      
      Please find attached your invoice #${invoice.invoiceNumber}
      
      Amount: $${invoice.total}
      Due Date: ${invoice.dueDate.toDateString()}
      
      PDF: ${pdfUrl}
      
      Best regards,
      Sugar-Daddy Team
    `;

    this.logger.log(`Email sent to ${email}`);
  }

  /**
   * 創建定期發票（用於訂閱）
   */
  async createRecurringInvoice(userId: string, subscriptionId: string, amount: number): Promise<Invoice> {
    this.logger.log(`Creating recurring invoice for subscription ${subscriptionId}`);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = this.invoiceRepository.create({
      userId,
      subscriptionId,
      invoiceNumber: await this.generateInvoiceNumber(),
      subtotal: amount,
      tax: amount * 0.1,
      total: amount + amount * 0.1,
      currency: 'USD',
      items: [
        {
          description: 'Monthly Subscription',
          quantity: 1,
          unitPrice: amount,
          amount: amount,
        },
      ],
      dueDate,
      status: InvoiceStatus.ISSUED,
    });

    return await this.invoiceRepository.save(invoice);
  }
}
