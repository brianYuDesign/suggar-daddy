import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738814400000 implements MigrationInterface {
  name = 'InitialSchema1738814400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription_tiers table
    await queryRunner.query(`
      CREATE TABLE "subscription_tiers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "creatorId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "priceMonthly" decimal(10,2) NOT NULL,
        "priceYearly" decimal(10,2),
        "benefits" text array NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "stripePriceId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_tiers" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for subscription_tiers
    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_tiers_creatorId" ON "subscription_tiers" ("creatorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_tiers_isActive" ON "subscription_tiers" ("isActive")
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriberId" character varying NOT NULL,
        "creatorId" character varying NOT NULL,
        "tierId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "startDate" TIMESTAMP NOT NULL DEFAULT now(),
        "endDate" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "stripeSubscriptionId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for subscriptions
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_subscriberId" ON "subscriptions" ("subscriberId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_creatorId" ON "subscriptions" ("creatorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_tierId" ON "subscriptions" ("tierId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_status" ON "subscriptions" ("status")
    `);

    // Create unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_subscriptions_unique_active" 
      ON "subscriptions" ("subscriberId", "creatorId", "tierId") 
      WHERE "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_unique_active"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_tierId"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_creatorId"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_subscriberId"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP INDEX "IDX_subscription_tiers_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_subscription_tiers_creatorId"`);
    await queryRunner.query(`DROP TABLE "subscription_tiers"`);
  }
}