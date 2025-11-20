import express from "express";
import db from "../utils/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

/* ===========================================================
   EMPLOYEE LOGIN
=========================================================== */
router.post("/employeelogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("LOGIN REQUEST BODY:", req.body);

    const rows = await db.query(
      "SELECT * FROM employee WHERE email = ?",
      [email]
    );

    console.log("LOGIN DB RESULT:", rows);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Invalid email or password" });
    }

    const user = rows[0];

    // ⚠️ If password column is not found -> CRASH
    if (!user.password) {
      console.log("❌ ERROR: Password column missing or NULL in DB");
      return res.status(500).json({ error: "Password field missing in DB" });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { role: "employee", email: user.email, id: user.id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      loginStatus: true,
      message: "You are logged in",
      id: user.id,
    });

  } catch (err) {
    console.error("Employee login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


/* ===========================================================
   EMPLOYEE DETAIL
=========================================================== */
router.get("/detail/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await db.query(
      "SELECT * FROM employee WHERE id = ?",
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      Result: rows[0],
    });

  } catch (err) {
    console.error("Get employee detail error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
    });
  }
});


/* =========================================================== */
router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  return res.json({ Status: true });
});
/* =========================================================== */


router.get("/employee_is_clocked_in/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await db.query(
      "SELECT * FROM clock_records WHERE employee_id = ? AND clock_out IS NULL",
      [id]
    );

    return res.status(200).json({
      clockedIn: rows.length > 0,
    });

  } catch (err) {
    console.error("Clock-in status error:", err);
    return res.status(500).json({ success: false });
  }
});


router.post("/employee_clockin/:id", async (req, res) => {
  const { id } = req.params;
  const { work_from_type } = req.body;

  try {
    await db.query(
      "INSERT INTO clock_records (employee_id, clock_in, location, work_from_type) VALUES (?, NOW(), 'Office', ?)",
      [id, work_from_type]
    );

    return res.status(200).json({
      success: true,
      message: "Clock-In Successful",
    });

  } catch (err) {
    console.error("Clock-in Error:", err);
    return res.status(500).json({ success: false });
  }
});


router.post("/employee_clockout/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "UPDATE clock_records SET clock_out = NOW() WHERE employee_id = ? AND clock_out IS NULL",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Clock-Out Successful",
    });

  } catch (err) {
    console.error("Clock-out Error:", err);
    return res.status(500).json({ success: false });
  }
});

/* =========================================================== */

router.get("/calendar/:employeeId", async (req, res) => {
  const { employeeId } = req.params;

  try {
    const rows = await db.query(
      "SELECT * FROM clock_records WHERE employee_id = ?",
      [employeeId]
    );

    const calendarData = rows.map((row) => {
      const clockIn = row.clock_in ? new Date(row.clock_in) : null;
      const clockOut = row.clock_out ? new Date(row.clock_out) : null;

      return {
        date: clockIn ? clockIn.toISOString().slice(0, 10) : null,
        dayName: clockIn
          ? clockIn.toLocaleDateString("en-US", { weekday: "long" })
          : null,
        clockIn: clockIn ? clockIn.toISOString() : null,
        clockOut: clockOut ? clockOut.toISOString() : null,
        location: row.location,
        workFromType: row.work_from_type,
      };
    });

    res.status(200).json({
      success: true,
      calendarData,
    });

  } catch (err) {
    console.error("Calendar Error:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================================================== */

router.get("/employee/list", async (req, res) => {
  try {
    const rows = await db.query(
      "SELECT id, name, role FROM employee"
    );

    res.status(200).json({
      success: true,
      employees: rows,
    });

  } catch (err) {
    console.error("Employee List Error:", err);
    res.status(500).json({ success: false });
  }
});

export { router as employeeRouter };
