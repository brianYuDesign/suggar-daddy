import { Test, TestingModule } from "@nestjs/testing";
import { StripeWebhookController } from "./stripe/stripe-webhook.controller";
import { StripeWebhookService } from "./stripe/stripe-webhook.service";
import { BadRequestException } from "@nestjs/common";
import Stripe from "stripe";
import { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import { StripeService } from "@suggar-daddy/common";

describe("StripeWebhookController", () => {
  let controller: StripeWebhookController;
  let webhookService: jest.Mocked<StripeWebhookService>;
  let stripeService: jest.Mocked<StripeService>;

  const mockWebhookService = {
    handleEvent: jest.fn(),
  };

  const mockStripeService = {
    constructWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        {
          provide: StripeWebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
    webhookService = module.get(StripeWebhookService);
    stripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleWebhook", () => {
    it("should return { received: true } on successful webhook handling", async () => {
      const rawBody = Buffer.from("webhook-payload");
      const signature = "valid-signature";

      const mockEvent: Stripe.Event = {
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            status: "succeeded",
          } as any,
        },
        created: Math.floor(Date.now() / 1000),
        object: "event",
        api_version: "2023-10-16",
        account: "acct_123",
        livemode: false,
        pending_webhooks: 0,
        request: null,
      };

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockWebhookService.handleEvent.mockResolvedValue(undefined);

      const req = {
        rawBody,
      } as RawBodyRequest<Request>;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(mockStripeService.constructWebhookEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
      );
      expect(mockWebhookService.handleEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should throw BadRequestException when signature header is missing", async () => {
      const req = {
        rawBody: Buffer.from("webhook-payload"),
      } as RawBodyRequest<Request>;

      await expect(
        controller.handleWebhook(req, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when rawBody is missing", async () => {
      const req = {
        rawBody: undefined,
      } as RawBodyRequest<Request>;

      await expect(
        controller.handleWebhook(req, "valid-signature"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle payment_intent.succeeded event", async () => {
      const rawBody = Buffer.from("webhook-payload");
      const signature = "valid-signature";

      const mockEvent: Stripe.Event = {
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            status: "succeeded",
          } as any,
        },
        created: Math.floor(Date.now() / 1000),
        object: "event",
        api_version: "2023-10-16",
        account: "acct_123",
        livemode: false,
        pending_webhooks: 0,
        request: null,
      };

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockWebhookService.handleEvent.mockResolvedValue(undefined);

      const req = {
        rawBody,
      } as RawBodyRequest<Request>;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(mockWebhookService.handleEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle payment_intent.payment_failed event", async () => {
      const rawBody = Buffer.from("webhook-payload");
      const signature = "valid-signature";

      const mockEvent: Stripe.Event = {
        id: "evt_456",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_failed",
            status: "requires_payment_method",
          } as any,
        },
        created: Math.floor(Date.now() / 1000),
        object: "event",
        api_version: "2023-10-16",
        account: "acct_123",
        livemode: false,
        pending_webhooks: 0,
        request: null,
      };

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockWebhookService.handleEvent.mockResolvedValue(undefined);

      const req = {
        rawBody,
      } as RawBodyRequest<Request>;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(mockWebhookService.handleEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle errors from webhook service gracefully", async () => {
      const rawBody = Buffer.from("webhook-payload");
      const signature = "valid-signature";

      const mockEvent: Stripe.Event = {
        id: "evt_789",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_error",
          } as any,
        },
        created: Math.floor(Date.now() / 1000),
        object: "event",
        api_version: "2023-10-16",
        account: "acct_123",
        livemode: false,
        pending_webhooks: 0,
        request: null,
      };

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockWebhookService.handleEvent.mockRejectedValue(
        new Error("Processing error"),
      );

      const req = {
        rawBody,
      } as RawBodyRequest<Request>;

      // Even if webhook service throws, we still return { received: true }
      // to Stripe to acknowledge receipt
      await expect(controller.handleWebhook(req, signature)).rejects.toThrow(
        "Processing error",
      );
    });
  });
});
