import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// THIS IS THE ONLY CORRECT FORMAT — USED IN ALL MYSQL PROJECTS
const db = {
  query: async (sql, params = []) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;  // <- ALWAYS return rows only (NO .rows, NO object)
    } catch (err) {
      console.error("Database Query Error:", err);
      throw err;
    }
  }
};

export default db;
