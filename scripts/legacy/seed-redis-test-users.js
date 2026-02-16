#!/usr/bin/env node
/**
 * Seed test users directly into Redis for E2E testing.
 *
 * Auth service stores users in Redis (not PostgreSQL).
 * This script creates the 3 test accounts so login works in e2e tests.
 *
 * Usage:
 *   node scripts/seed-redis-test-users.js
 *   # or with custom redis host:
 *   REDIS_HOST=localhost REDIS_PORT=6379 node scripts/seed-redis-test-users.js
 */

const Redis = require('ioredis');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const USER_EMAIL_PREFIX = 'user:email:';

const TEST_USERS = [
  {
    email: 'subscriber@test.com',
    password: 'Test1234!',
    userType: 'sugar_daddy',
    displayName: 'Test Subscriber',
  },
  {
    email: 'creator@test.com',
    password: 'Test1234!',
    userType: 'sugar_baby',
    displayName: 'Test Creator',
  },
  {
    email: 'admin@test.com',
    password: 'Admin1234!',
    userType: 'sugar_daddy',
    displayName: 'Test Admin',
    isAdmin: true,
  },
];

async function main() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  console.log(`Connecting to Redis at ${host}:${port}...`);

  const redis = new Redis({
    host,
    port,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
  });

  try {
    await redis.ping();
    console.log('Redis connected.');

    for (const testUser of TEST_USERS) {
      const normalizedEmail = testUser.email.trim().toLowerCase();
      const emailKey = USER_EMAIL_PREFIX + normalizedEmail;

      // Check if user already exists
      const existingUserId = await redis.get(emailKey);
      if (existingUserId) {
        // Verify the user data still exists
        const existingUser = await redis.get(`user:${existingUserId}`);
        if (existingUser) {
          console.log(`✓ ${normalizedEmail} already exists (userId=${existingUserId})`);
          continue;
        }
        // User mapping exists but data is gone - recreate
        console.log(`⚠ ${normalizedEmail} mapping exists but data missing, recreating...`);
      }

      const userId = `test-${testUser.userType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await bcrypt.hash(testUser.password, SALT_ROUNDS);

      const storedUser = {
        userId,
        email: normalizedEmail,
        passwordHash,
        userType: testUser.userType,
        displayName: testUser.displayName,
        bio: `E2E test account (${testUser.userType})`,
        accountStatus: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      // If admin, also add permissionRole
      if (testUser.isAdmin) {
        storedUser.permissionRole = 'ADMIN';
      }

      const userKey = `user:${userId}`;
      await redis.set(userKey, JSON.stringify(storedUser));
      await redis.set(emailKey, userId);

      console.log(`✓ Created ${normalizedEmail} → userId=${userId} (${testUser.userType}${testUser.isAdmin ? ', ADMIN' : ''})`);
    }

    // Verify all users can be looked up
    console.log('\n--- Verification ---');
    for (const testUser of TEST_USERS) {
      const emailKey = USER_EMAIL_PREFIX + testUser.email;
      const userId = await redis.get(emailKey);
      if (!userId) {
        console.error(`✗ ${testUser.email} NOT FOUND in Redis!`);
        process.exit(1);
      }
      const userData = await redis.get(`user:${userId}`);
      if (!userData) {
        console.error(`✗ user:${userId} data NOT FOUND!`);
        process.exit(1);
      }
      const parsed = JSON.parse(userData);
      // Verify password
      const valid = await bcrypt.compare(testUser.password, parsed.passwordHash);
      console.log(`✓ ${testUser.email} → ${userId} | password=${valid ? 'OK' : 'MISMATCH!'} | status=${parsed.accountStatus}`);
      if (!valid) {
        console.error(`  ✗ Password mismatch! Updating...`);
        parsed.passwordHash = await bcrypt.hash(testUser.password, SALT_ROUNDS);
        await redis.set(`user:${userId}`, JSON.stringify(parsed));
        console.log(`  ✓ Password updated.`);
      }
    }

    console.log('\n✅ All test users seeded and verified successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

main();
