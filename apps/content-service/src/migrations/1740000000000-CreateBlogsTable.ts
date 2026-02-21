// apps/content-service/src/migrations/1740000000000-CreateBlogsTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogsTable1740000000000 implements MigrationInterface {
  name = 'CreateBlogsTable1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."blogs_status_enum" AS ENUM ('draft', 'published', 'archived')`);
    await queryRunner.query(`CREATE TYPE "public"."blogs_category_enum" AS ENUM ('guide', 'safety', 'tips', 'story', 'news')`);
    await queryRunner.query(`
      CREATE TABLE "blogs" (
        "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "title"           character varying(200) NOT NULL,
        "slug"            character varying(250) NOT NULL,
        "content"         text              NOT NULL,
        "excerpt"         text,
        "coverImage"      character varying,
        "category"        "public"."blogs_category_enum" NOT NULL DEFAULT 'guide',
        "tags"            text,
        "status"          "public"."blogs_status_enum"   NOT NULL DEFAULT 'draft',
        "authorId"        character varying,
        "authorName"      character varying,
        "viewCount"       integer           NOT NULL DEFAULT 0,
        "metaTitle"       character varying,
        "metaDescription" text,
        "publishedAt"     TIMESTAMP,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blogs_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blogs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_blogs_slug" ON "blogs" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_blogs_status" ON "blogs" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_blogs_status"`);
    await queryRunner.query(`DROP INDEX "IDX_blogs_slug"`);
    await queryRunner.query(`DROP TABLE "blogs"`);
    await queryRunner.query(`DROP TYPE "public"."blogs_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blogs_status_enum"`);
  }
}