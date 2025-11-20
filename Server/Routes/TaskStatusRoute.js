import express from "express";
import db from "../utils/db.js";

const router = express.Router();

/**
 * UPDATE TASK STATUS (EMPLOYEE → Assigned Tasks)
 * PUT /taskstatus/:taskId
 */
router.put("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  try {
    // Check if task exists
    const [task] = await db.query(
      "SELECT * FROM task_assignments WHERE id = ?",
      [taskId]
    );

    if (task.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Update status
    await db.query(
      "UPDATE task_assignments SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, taskId]
    );

    res.json({
      success: true,
      message: "Task status updated successfully",
    });
  } catch (error) {
    console.error("Task status update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export { router as taskStatusRouter };
