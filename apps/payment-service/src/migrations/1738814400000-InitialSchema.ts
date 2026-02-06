import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738814400000 implements MigrationInterface {
  name = 'InitialSchema1738814400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "type" character varying NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "status" character varying NOT NULL DEFAULT 'pending',
        "stripePaymentIntentId" character varying,
        "description" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for transactions
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_type" ON "transactions" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_createdAt" ON "transactions" ("createdAt")
    `);

    // Create post_purchases table
    await queryRunner.query(`
      CREATE TABLE "post_purchases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "postId" character varying NOT NULL,
        "transactionId" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "accessGrantedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_purchases" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for post_purchases
    await queryRunner.query(`
      CREATE INDEX "IDX_post_purchases_userId" ON "post_purchases" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_purchases_postId" ON "post_purchases" ("postId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_post_purchases_unique" ON "post_purchases" ("userId", "postId")
    `);

    // Create tips table
    await queryRunner.query(`
      CREATE TABLE "tips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "senderId" character varying NOT NULL,
        "recipientId" character varying NOT NULL,
        "transactionId" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "message" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tips" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for tips
    await queryRunner.query(`
      CREATE INDEX "IDX_tips_senderId" ON "tips" ("senderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tips_recipientId" ON "tips" ("recipientId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tips_createdAt" ON "tips" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tips_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_tips_recipientId"`);
    await queryRunner.query(`DROP INDEX "IDX_tips_senderId"`);
    await queryRunner.query(`DROP TABLE "tips"`);
    await queryRunner.query(`DROP INDEX "IDX_post_purchases_unique"`);
    await queryRunner.query(`DROP INDEX "IDX_post_purchases_postId"`);
    await queryRunner.query(`DROP INDEX "IDX_post_purchases_userId"`);
    await queryRunner.query(`DROP TABLE "post_purchases"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_type"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_userId"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
  }
}