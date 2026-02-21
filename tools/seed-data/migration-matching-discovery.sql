-- Migration: Matching & Discovery Enhancement (Phase 1 + 2)
-- Tables: interest_tags, user_interest_tags, user_behavior_events
-- User columns: birthDate, preferredAgeMin/Max, preferredDistance, preferredUserType, lastActiveAt, verificationStatus
-- Run AFTER the initial schema migration

-- Enable uuid generation if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Interest Tags table
-- ============================================================
CREATE TABLE IF NOT EXISTS "interest_tags" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "category" varchar(20) NOT NULL,
  "name" varchar(50) NOT NULL,
  "nameZh" varchar(50),
  "icon" varchar(10),
  "sortOrder" int NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  CONSTRAINT "PK_interest_tags" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_interest_tags_category_name" UNIQUE ("category", "name")
);

CREATE INDEX IF NOT EXISTS "IDX_interest_tags_category" ON "interest_tags" ("category");

-- ============================================================
-- 2. User Interest Tags (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_interest_tags" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "tagId" uuid NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_interest_tags" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_interest_tags_user_tag" UNIQUE ("userId", "tagId"),
  CONSTRAINT "FK_user_interest_tags_tag" FOREIGN KEY ("tagId")
    REFERENCES "interest_tags" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_user_interest_tags_user" ON "user_interest_tags" ("userId");
CREATE INDEX IF NOT EXISTS "idx_user_interest_tags_tag" ON "user_interest_tags" ("tagId");

-- ============================================================
-- 3. User Behavior Events
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_behavior_events" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "targetUserId" uuid,
  "eventType" varchar(30) NOT NULL,
  "metadata" jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_behavior_events" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_behavior_user_created" ON "user_behavior_events" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_behavior_type" ON "user_behavior_events" ("eventType");

-- ============================================================
-- 4. User table additions (if columns don't exist)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='birthDate') THEN
    ALTER TABLE "users" ADD COLUMN "birthDate" date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferredAgeMin') THEN
    ALTER TABLE "users" ADD COLUMN "preferredAgeMin" int DEFAULT 18;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferredAgeMax') THEN
    ALTER TABLE "users" ADD COLUMN "preferredAgeMax" int DEFAULT 80;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferredDistance') THEN
    ALTER TABLE "users" ADD COLUMN "preferredDistance" int DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferredUserType') THEN
    ALTER TABLE "users" ADD COLUMN "preferredUserType" varchar(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lastActiveAt') THEN
    ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verificationStatus') THEN
    ALTER TABLE "users" ADD COLUMN "verificationStatus" varchar(20) DEFAULT 'unverified';
  END IF;
END $$;
