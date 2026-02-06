import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  findAll() {
    this.logger.log('Finding all transactions');
    return [];
  }
}