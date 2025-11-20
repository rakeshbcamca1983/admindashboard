import express from "express";
import db from "../utils/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();
const router = express.Router();

/* =========================================
   ADMIN LOGIN (CORRECTED FOR MYSQL2 + db.query)
========================================= */
router.post("/adminlogin", async (req, res) => {
  const { email, password } = req.body;
  console.log("🔐 Admin Login:", email);

  try {
    const rows = await db.query("SELECT * FROM admin WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(404).json({
        loginStatus: false,
        error: "User not found",
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        loginStatus: false,
        error: "Incorrect Email or Password",
      });
    }

    const token = jwt.sign(
      { role: "admin", email: user.email, id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 3600000,
      secure: false,
    });

    return res.status(200).json({
      loginStatus: true,
      message: "Login Successful",
      id: user.id,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      loginStatus: false,
      error: "Internal Server Error",
    });
  }
});

/* =========================================
   CATEGORY ROUTES
========================================= */
router.get("/category", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM category");
    res.json({ success: true, categories: rows });
  } catch (error) {
    res.json({ success: false, message: "Failed to load category" });
  }
});

router.post("/add_category", async (req, res) => {
  const { name } = req.body;

  try {
    await db.query("INSERT INTO category (name) VALUES (?)", [name]);
    res.status(200).json({ success: true, message: "Category added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add category" });
  }
});

/* =========================================
   MULTER STORAGE
========================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/images"),
  filename: (req, file, cb) =>
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* =========================================
   ADD EMPLOYEE
========================================= */
router.post("/add_employee", upload.single("image"), async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);

    await db.query(
      "INSERT INTO employee (name, email, password, address, salary, image, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        req.body.name,
        req.body.email,
        hashed,
        req.body.address,
        req.body.salary,
        req.file.filename,
        req.body.category_id,
      ]
    );

    res.status(200).json({ success: true, message: "Employee added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add employee" });
  }
});

/* =========================================
   EMPLOYEE CRUD
========================================= */
router.get("/employee", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM employee");
    res.json({ success: true, Result: rows });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch employees" });
  }
});

router.delete("/delete_employee/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const imgRes = await db.query("SELECT image FROM employee WHERE id = ?", [id]);

    if (imgRes.length && imgRes[0].image) {
      fs.unlinkSync(`public/images/${imgRes[0].image}`);
    }

    await db.query("DELETE FROM employee WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete employee" });
  }
});

router.get("/employee/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await db.query("SELECT * FROM employee WHERE id = ?", [id]);
    res.json({ success: true, Result: rows });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch employee" });
  }
});

router.put("/edit_employee/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, salary, address, category_id } = req.body;

  try {
    await db.query(
      "UPDATE employee SET name = ?, email = ?, salary = ?, address = ?, category_id = ? WHERE id = ?",
      [name, email, salary, address, category_id, id]
    );

    res.json({ success: true, message: "Employee updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update employee" });
  }
});

/* =========================================
   DASHBOARD COUNTS
========================================= */
router.get("/admin_count", async (req, res) => {
  try {
    const rows = await db.query("SELECT COUNT(id) AS admin FROM admin");
    res.json({ Status: true, Result: rows });
  } catch (error) {
    res.json({ Status: false, Error: "Failed to fetch admin count" });
  }
});

router.get("/employee_count", async (req, res) => {
  try {
    const rows = await db.query("SELECT COUNT(id) AS employee FROM employee");
    res.json({ Status: true, Result: rows });
  } catch (error) {
    res.json({ Status: false, Error: "Failed to fetch employee count" });
  }
});

router.get("/salary_count", async (req, res) => {
  try {
    const rows = await db.query("SELECT SUM(salary) AS salaryOFEmp FROM employee");
    res.json({ Status: true, Result: rows });
  } catch (error) {
    res.json({ Status: false, Error: "Failed to fetch salary count" });
  }
});

router.get("/admin_records", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM admin");
    res.json({ Status: true, Result: rows });
  } catch (error) {
    res.json({ Status: false, Error: "Failed to fetch admin records" });
  }
});

/* =========================================
   ADMIN UPDATE / DELETE
========================================= */
router.put("/edit_admin/:id", async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    await db.query("UPDATE admin SET email = ? WHERE id = ?", [email, id]);

    res.json({ success: true, message: "Admin updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update admin" });
  }
});

router.delete("/delete_admin/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM admin WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "Admin deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete admin" });
  }
});

/* =========================================
   ADD ADMIN
========================================= */
router.post("/add_admin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    await db.query("INSERT INTO admin (email, password) VALUES (?, ?)", [
      email,
      hashed,
    ]);

    res.status(200).json({ success: true, message: "Admin added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add admin" });
  }
});

/* =========================================
   LOGOUT
========================================= */
router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  return res.json({ Status: true });
});

export { router as adminRouter };
