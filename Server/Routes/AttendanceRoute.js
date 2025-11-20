import express from "express";
import db from "../utils/db.js";

export const attendanceRouter = express.Router();

// ----------- GET DAILY ATTENDANCE SUMMARY -----------
attendanceRouter.get("/", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const [rows] = await db.query(
      `
      SELECT 
          (SELECT COUNT(*) FROM clock_records WHERE DATE(clock_in) = ?) AS present,
          ((SELECT COUNT(*) FROM employee) - 
           (SELECT COUNT(*) FROM clock_records WHERE DATE(clock_in) = ?)) AS absent
      `,
      [today, today]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error fetching attendance data:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ----------- CLOCK IN -----------
attendanceRouter.post("/clock_in", async (req, res) => {
  try {
    const { employee_id, location, work_from_type } = req.body;

    await db.query(
      `INSERT INTO clock_records (employee_id, clock_in, location, work_from_type)
       VALUES (?, NOW(), ?, ?)`,
      [employee_id, location, work_from_type]
    );

    res.json({ Status: true, Message: "Clock-in successful" });
  } catch (error) {
    console.error("❌ Clock-in error:", error);
    res.status(500).json({ error: "Clock-in failed" });
  }
});

// ----------- CLOCK OUT -----------
attendanceRouter.post("/clock_out", async (req, res) => {
  try {
    const { employee_id } = req.body;

    await db.query(
      `UPDATE clock_records 
       SET clock_out = NOW() 
       WHERE employee_id = ? AND clock_out IS NULL`,
      [employee_id]
    );

    res.json({ Status: true, Message: "Clock-out successful" });
  } catch (error) {
    console.error("❌ Clock-out error:", error);
    res.status(500).json({ error: "Clock-out failed" });
  }
});

