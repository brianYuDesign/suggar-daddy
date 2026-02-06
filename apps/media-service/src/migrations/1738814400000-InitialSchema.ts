import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738814400000 implements MigrationInterface {
  name = 'InitialSchema1738814400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create media_files table
    await queryRunner.query(`
      CREATE TABLE "media_files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "filename" character varying NOT NULL,
        "originalName" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "storageProvider" character varying NOT NULL DEFAULT 'cloudinary',
        "storageUrl" character varying NOT NULL,
        "thumbnailUrl" character varying,
        "width" integer,
        "height" integer,
        "duration" integer,
        "uploadStatus" character varying NOT NULL DEFAULT 'completed',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_files" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for media_files
    await queryRunner.query(`
      CREATE INDEX "IDX_media_files_userId" ON "media_files" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_files_mimeType" ON "media_files" ("mimeType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_files_uploadStatus" ON "media_files" ("uploadStatus")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_files_createdAt" ON "media_files" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_media_files_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_uploadStatus"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_mimeType"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_userId"`);
    await queryRunner.query(`DROP TABLE "media_files"`);
  }
}