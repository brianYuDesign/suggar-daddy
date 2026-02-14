/**
 * Seed test users for E2E testing
 */
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";

async function seedTestUsers() {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "suggar_daddy",
    entities: ["libs/database/src/**/*.entity.ts"],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log("✓ Connected to database");

    const users = [
      {
        email: "creator@test.com",
        password: await bcrypt.hash("Test1234!", 10),
        displayName: "Test Creator",
        role: "sugar_baby",
        verified: true,
      },
      {
        email: "subscriber@test.com",
        password: await bcrypt.hash("Test1234!", 10),
        displayName: "Test Subscriber",
        role: "sugar_daddy",
        verified: true,
      },
      {
        email: "admin@test.com",
        password: await bcrypt.hash("Admin1234!", 10),
        displayName: "Test Admin",
        role: "sugar_daddy",
        isAdmin: true,
        verified: true,
      },
    ];

    for (const userData of users) {
      // Check if user exists
      const existing = await dataSource.query(
        'SELECT id FROM "user" WHERE email = $1',
        [userData.email],
      );

      if (existing.length > 0) {
        console.log(`- User ${userData.email} already exists, updating...`);
        await dataSource.query(
          `UPDATE "user" 
           SET password = $1, display_name = $2, role = $3, verified = $4, is_admin = $5
           WHERE email = $6`,
          [
            userData.password,
            userData.displayName,
            userData.role,
            userData.verified,
            userData.isAdmin || false,
            userData.email,
          ],
        );
      } else {
        console.log(`+ Creating user ${userData.email}...`);
        await dataSource.query(
          `INSERT INTO "user" (email, password, display_name, role, verified, is_admin, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            userData.email,
            userData.password,
            userData.displayName,
            userData.role,
            userData.verified,
            userData.isAdmin || false,
          ],
        );
      }
      console.log(`✓ ${userData.email} ready`);
    }

    console.log("\n✓ All test users seeded successfully");
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding users:", error);
    process.exit(1);
  }
}

seedTestUsers();
