import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738814400000 implements MigrationInterface {
  name = 'InitialSchema1738814400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create posts table
    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "creatorId" character varying NOT NULL,
        "contentType" character varying NOT NULL,
        "caption" text,
        "mediaUrls" text array NOT NULL DEFAULT '{}',
        "visibility" character varying NOT NULL DEFAULT 'public',
        "requiredTierId" character varying,
        "ppvPrice" decimal(10,2),
        "likeCount" integer NOT NULL DEFAULT 0,
        "commentCount" integer NOT NULL DEFAULT 0,
        "viewCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_posts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for posts
    await queryRunner.query(`
      CREATE INDEX "IDX_posts_creatorId" ON "posts" ("creatorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_posts_visibility" ON "posts" ("visibility")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_posts_createdAt" ON "posts" ("createdAt")
    `);

    // Create post_likes table
    await queryRunner.query(`
      CREATE TABLE "post_likes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "postId" uuid NOT NULL,
        "userId" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_likes" PRIMARY KEY ("id")
      )
    `);

    // Create indexes and unique constraint for post_likes
    await queryRunner.query(`
      CREATE INDEX "IDX_post_likes_postId" ON "post_likes" ("postId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_likes_userId" ON "post_likes" ("userId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_post_likes_unique" ON "post_likes" ("postId", "userId")
    `);

    // Create post_comments table
    await queryRunner.query(`
      CREATE TABLE "post_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "postId" uuid NOT NULL,
        "userId" character varying NOT NULL,
        "content" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_comments" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for post_comments
    await queryRunner.query(`
      CREATE INDEX "IDX_post_comments_postId" ON "post_comments" ("postId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_comments_userId" ON "post_comments" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_comments_createdAt" ON "post_comments" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_post_comments_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_post_comments_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_post_comments_postId"`);
    await queryRunner.query(`DROP TABLE "post_comments"`);
    await queryRunner.query(`DROP INDEX "IDX_post_likes_unique"`);
    await queryRunner.query(`DROP INDEX "IDX_post_likes_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_post_likes_postId"`);
    await queryRunner.query(`DROP TABLE "post_likes"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_visibility"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_creatorId"`);
    await queryRunner.query(`DROP TABLE "posts"`);
  }
}