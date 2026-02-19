import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvoiceService } from '../services/invoice.service';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { ConfigService } from '../services/config.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockInvoiceRepository: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockInvoiceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn().mockResolvedValue(100),
    };

    mockConfigService = {
      getAwsS3Bucket: jest.fn().mockReturnValue('payment-invoices'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const dto = {
        userId: 'user-123',
        items: [
          { description: 'Premium Plan', quantity: 1, unitPrice: 9.99 },
        ],
      };

      const mockInvoice = {
        id: 'inv-123',
        invoiceNumber: 'INV-2026-000101',
        status: InvoiceStatus.DRAFT,
        total: 10.99,
      };

      mockInvoiceRepository.create.mockReturnValue(mockInvoice);
      mockInvoiceRepository.save.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(dto);

      expect(result.id).toBe('inv-123');
      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(mockInvoiceRepository.save).toHaveBeenCalled();
    });
  });

  describe('getInvoice', () => {
    it('should retrieve an invoice by ID', async () => {
      const invoiceId = 'inv-123';
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: 'INV-2026-000101',
        status: InvoiceStatus.ISSUED,
      };

      mockInvoiceRepository.findOneBy.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice(invoiceId);

      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockInvoiceRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getInvoice('invalid-id')).rejects.toThrow('Invoice not found');
    });
  });

  describe('getUserInvoices', () => {
    it('should retrieve user invoices with pagination', async () => {
      const userId = 'user-123';
      const mockInvoices = [
        { id: 'inv-1', userId, total: 10.99 },
        { id: 'inv-2', userId, total: 5.49 },
      ];

      mockInvoiceRepository.findAndCount.mockResolvedValue([mockInvoices, 2]);

      const result = await service.getUserInvoices(userId, 20, 0);

      expect(result.invoices).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      const invoiceId = 'inv-123';
      const mockInvoice = {
        id: invoiceId,
        status: InvoiceStatus.ISSUED,
      };

      mockInvoiceRepository.findOneBy.mockResolvedValue(mockInvoice);
      mockInvoiceRepository.save.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
        paidDate: expect.any(Date),
      });

      const result = await service.markAsPaid(invoiceId);

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paidDate).toBeDefined();
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel an unpaid invoice', async () => {
      const invoiceId = 'inv-123';
      const mockInvoice = {
        id: invoiceId,
        status: InvoiceStatus.ISSUED,
      };

      mockInvoiceRepository.findOneBy.mockResolvedValue(mockInvoice);
      mockInvoiceRepository.save.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });

      const result = await service.cancelInvoice(invoiceId);

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should throw error if invoice is already paid', async () => {
      const invoiceId = 'inv-123';
      const mockInvoice = {
        id: invoiceId,
        status: InvoiceStatus.PAID,
      };

      mockInvoiceRepository.findOneBy.mockResolvedValue(mockInvoice);

      await expect(service.cancelInvoice(invoiceId)).rejects.toThrow(
        'Cannot cancel paid invoice',
      );
    });
  });
});
