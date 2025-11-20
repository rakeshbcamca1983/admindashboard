import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function checkAdmin() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "worksuite_db",
    });

    console.log("✅ Connected to database\n");

    // Check current admin record
    const [rows] = await connection.execute(
      "SELECT id, email, password FROM admin WHERE email = ?",
      ["admin@gmail.com"]
    );

    if (rows.length > 0) {
      console.log("📋 Current Admin Record:");
      console.log("ID:", rows[0].id);
      console.log("Email:", rows[0].email);
      console.log("Password Hash:", rows[0].password);
      console.log("Password Length:", rows[0].password.length);
      
      // Check if it looks like a proper bcrypt hash
      if (rows[0].password.startsWith("$2a$") || rows[0].password.startsWith("$2b$")) {
        console.log("\n✅ Password is properly hashed (bcrypt format detected)");
      } else {
        console.log("\n❌ Password does NOT appear to be hashed!");
      }
    } else {
      console.log("❌ No admin found with email: admin@gmail.com");
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full Error:", error);
    if (connection) {
      await connection.end();
    }
  }
}

checkAdmin();
