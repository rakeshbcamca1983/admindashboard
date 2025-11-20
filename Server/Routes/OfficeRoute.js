import express from "express";
import db from "../utils/db.js";

const router = express.Router();

// GET all office locations
router.get("/office_location", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM office_locations ORDER BY id DESC");
    res.json({ success: true, officeLocations: result.rows });
  } catch (err) {
    console.error("Fetch Office Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ADD new office location
router.post("/office_location", async (req, res) => {
  const { name, latitude, longitude, address } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO office_locations (name, latitude, longitude, address) VALUES (?, ?, ?, ?)",
      [name, latitude, longitude, address]
    );

    res.json({
      success: true,
      officeLocation: {
        id: result.insertId,
        name,
        latitude,
        longitude,
        address,
      },
    });
  } catch (err) {
    console.error("Add Office Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// DELETE office location
router.delete("/office_location/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM office_locations WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Location deleted" });
  } catch (err) {
    console.error("Delete Office Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export { router as officeRouter };
