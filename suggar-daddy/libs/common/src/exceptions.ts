import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class MatchNotFoundException extends HttpException {
  constructor(matchId: string) {
    super(`Match with ID ${matchId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class AlreadySwipedException extends HttpException {
  constructor() {
    super('You have already swiped on this user', HttpStatus.CONFLICT);
  }
}

export class SelfSwipeException extends HttpException {
  constructor() {
    super('You cannot swipe on yourself', HttpStatus.BAD_REQUEST);
  }
}

export class InsufficientBalanceException extends HttpException {
  constructor() {
    super('Insufficient balance', HttpStatus.PAYMENT_REQUIRED);
  }
}

export class SubscriptionExistsException extends HttpException {
  constructor() {
    super('You are already subscribed to this creator', HttpStatus.CONFLICT);
  }
}
