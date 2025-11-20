import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function seedAdmin() {
  let connection;
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    console.log("Generated hashed password for 'admin123'");

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log("✅ Connected to database");

    // Check correct table name
    const [tables] = await connection.execute("SHOW TABLES LIKE 'admins';");

    let tableName = tables.length ? "admins" : "admin";

    console.log(`📌 Using table: ${tableName}`);

    const [result] = await connection.execute(
      `UPDATE ${tableName} SET password = ? WHERE email = ?`,
      [hashedPassword, "admin@gmail.com"]
    );

    console.log("✅ Admin password updated successfully");
    console.log("\n🔑 Admin Credentials:");
    console.log("📧 Email: admin@gmail.com");
    console.log("🔐 Password: admin123\n");

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error("❌ Error updating admin password:", error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

seedAdmin();
