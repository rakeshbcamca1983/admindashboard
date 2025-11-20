import express from "express";
import db from "../utils/db.js";

const router = express.Router();

/* -------------------------------------------
   GET ONGOING PROJECTS (LAST 7 DAYS)
------------------------------------------- */
router.get("/ongoing", async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const projects = await db.query(
      "SELECT * FROM projects WHERE created_at >= ? ORDER BY start_date ASC",
      [oneWeekAgo]
    );

    res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error("Error fetching ongoing projects:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* -------------------------------------------
   GET ALL PROJECTS
------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const projects = await db.query(
      "SELECT p.*, c.name AS client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.client_id ORDER BY p.project_id DESC"
    );

    res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* -------------------------------------------
   GET PROJECT BY ID
------------------------------------------- */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM projects WHERE project_id = ?",
      [id]
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.status(200).json({ success: true, project: result[0] });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* -------------------------------------------
   CREATE NEW PROJECT
------------------------------------------- */
router.post("/", async (req, res) => {
  const {
    title,
    description,
    status,
    completion_date,
    start_date,
    priority,
    client_id,
  } = req.body;

  const created_by = 1; // TEMP

  if (!title || !client_id) {
    return res.json({
      success: false,
      message: "Title and client_id are required",
    });
  }

  try {
    const sql = `
      INSERT INTO projects 
      (title, description, status, completion_date, start_date, priority, client_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      title,
      description || "",
      status || "Not Started",
      completion_date || null,
      start_date || null,
      priority || "Medium",
      client_id,
      created_by,
    ];

    const result = await db.query(sql, params);

    const inserted = await db.query(
      "SELECT * FROM projects WHERE project_id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: inserted[0],
    });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* -------------------------------------------
   UPDATE PROJECT
------------------------------------------- */
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  const {
    title,
    description,
    status,
    completion_date,
    start_date,
    priority,
    client_id,
  } = req.body;

  try {
    const sql = `
      UPDATE projects 
      SET title = ?, description = ?, status = ?, completion_date = ?, 
          start_date = ?, priority = ?, client_id = ?, updated_at = NOW()
      WHERE project_id = ?
    `;

    await db.query(sql, [
      title,
      description,
      status,
      completion_date,
      start_date,
      priority,
      client_id,
      id,
    ]);

    const updated = await db.query(
      "SELECT * FROM projects WHERE project_id = ?",
      [id]
    );

    if (updated.length === 0) {
      return res.json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, project: updated[0] });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* -------------------------------------------
   DELETE PROJECT
------------------------------------------- */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM projects WHERE project_id = ?", [id]);

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export { router as projectRouter };
