import express from "express";
import db from "../utils/db.js";
import { io } from "../index.js";

const router = express.Router();

/**
 * Normalize db.query() results across wrappers:
 * - mysql2: pool.execute() returns [rows, fields]
 * - some wrappers return rows directly (Array of objects)
 * - INSERT/UPDATE return an OkPacket object with insertId / affectedRows
 *
 * Returns: { rows: Array, info: any }
 */
const normalizeResult = (res) => {
  // case A: mysql2 `pool.execute()` => [rows, fields]
  if (Array.isArray(res) && Array.isArray(res[0])) {
    return { rows: res[0], info: res[1] || null };
  }

  // case B: wrapper returned rows array directly (most common in this project)
  if (Array.isArray(res) && (res.length === 0 || typeof res[0] === "object")) {
    return { rows: res, info: null };
  }

  // case C: OkPacket (insert/update/delete result) is object with insertId/affectedRows
  if (res && typeof res === "object") {
    // If it has insertId or affectedRows treat as info
    const hasInfo = "insertId" in res || "affectedRows" in res || "affected_rows" in res;
    if (hasInfo) {
      return { rows: [], info: res };
    }
    // If it has rows property (custom wrapper)
    if ("rows" in res && Array.isArray(res.rows)) {
      return { rows: res.rows, info: res };
    }
  }

  return { rows: [], info: null };
};

/* ============================================================
   POST /tasks    -> Create task
   body: { description, deadline, status, employee_ids, project_id }
============================================================ */
router.post("/", async (req, res) => {
  const { description, deadline, status, employee_ids = [], project_id } = req.body;

  if (!description || !deadline || !status || !project_id) {
    return res.status(400).json({
      success: false,
      message: "Description, deadline, status, and project ID are required",
    });
  }

  try {
    // INSERT task (MySQL no RETURNING)
    const insertSql = `
      INSERT INTO tasks (description, deadline, status, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    const insertRes = await db.query(insertSql, [description, deadline, status, project_id]);
    const { info: insertInfo } = normalizeResult(insertRes);

    // get insert id (mysql OkPacket)
    const newTaskId = insertInfo && (insertInfo.insertId || insertInfo.insert_id);

    // Fallback: try to find inserted row if insertId unavailable
    let finalTaskId = newTaskId;
    if (!finalTaskId) {
      const findRes = await db.query(
        `SELECT * FROM tasks WHERE description = ? AND project_id = ? ORDER BY created_at DESC LIMIT 1`,
        [description, project_id]
      );
      const { rows: findRows } = normalizeResult(findRes);
      if (findRows && findRows.length > 0) finalTaskId = findRows[0].task_id;
    }

    // Insert assignments
    if (Array.isArray(employee_ids) && employee_ids.length > 0 && finalTaskId) {
      const insertAssignSql =
        "INSERT INTO task_assignments (task_id, employee_id, assigned_at) VALUES (?, ?, NOW())";
      for (const eid of employee_ids) {
        await db.query(insertAssignSql, [finalTaskId, eid]);
      }
    }

    // Fetch assigned employees (defensive)
    const assignFetchRes = await db.query(
      `
      SELECT ta.employee_id, e.name AS employee_name
      FROM task_assignments ta
      JOIN employee e ON ta.employee_id = e.id
      WHERE ta.task_id = ?
    `,
      [finalTaskId]
    );
    const { rows: assignedRows } = normalizeResult(assignFetchRes);

    // Emit socket events (safe)
    (assignedRows || []).forEach((row) => {
      io.to(`user_${row.employee_id}`).emit("taskAssigned", {
        taskId: finalTaskId,
        status,
        message: `Task #${finalTaskId} has been assigned to you`,
      });
    });

    // Return created task
    return res.status(201).json({
      success: true,
      task: {
        task_id: finalTaskId,
        description,
        deadline,
        status,
        project_id,
        employee_ids: (assignedRows || []).map((r) => r.employee_id),
        employee_names: (assignedRows || []).map((r) => r.employee_name),
      },
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   PUT /tasks/:taskId   -> Full update (description, deadline, status, project_id, assignments)
============================================================ */
router.put("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { description, deadline, status, employee_ids = [], project_id } = req.body;

  if (!description || !deadline || !status || !project_id) {
    return res.status(400).json({
      success: false,
      message: "Description, deadline, status, and project ID are required",
    });
  }

  try {
    // ensure exists
    const findRes = await db.query("SELECT * FROM tasks WHERE task_id = ?", [taskId]);
    const { rows: found } = normalizeResult(findRes);
    if (!found || found.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // update
    const updateSql = `
      UPDATE tasks
      SET description = ?, deadline = ?, status = ?, project_id = ?, updated_at = NOW()
      WHERE task_id = ?
    `;
    await db.query(updateSql, [description, deadline, status, project_id, taskId]);

    // replace assignments
    await db.query("DELETE FROM task_assignments WHERE task_id = ?", [taskId]);
    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      for (const eid of employee_ids) {
        await db.query(
          "INSERT INTO task_assignments (task_id, employee_id, assigned_at) VALUES (?, ?, NOW())",
          [taskId, eid]
        );
      }
    }

    // fetch assigned employees
    const assignmentRes = await db.query(
      `
      SELECT ta.employee_id, e.name AS employee_name
      FROM task_assignments ta
      JOIN employee e ON ta.employee_id = e.id
      WHERE ta.task_id = ?
    `,
      [taskId]
    );
    const { rows: assigned } = normalizeResult(assignmentRes);

    // notify assigned employees
    (assigned || []).forEach((row) => {
      io.to(`user_${row.employee_id}`).emit("taskUpdated", {
        taskId,
        status,
        message: `Task #${taskId} has been updated`,
      });
    });

    // fetch updated task
    const updatedRes = await db.query("SELECT * FROM tasks WHERE task_id = ?", [taskId]);
    const { rows: updatedRows } = normalizeResult(updatedRes);

    const updatedTask = (updatedRows && updatedRows[0]) || {
      task_id: taskId,
      description,
      deadline,
      status,
      project_id,
    };

    updatedTask.employee_ids = (assigned || []).map((r) => r.employee_id);
    updatedTask.employee_names = (assigned || []).map((r) => r.employee_name);

    return res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   PATCH /tasks/:taskId/reassign  -> Replace assignments
============================================================ */
router.patch("/:taskId/reassign", async (req, res) => {
  const { taskId } = req.params;
  const { employee_ids = [] } = req.body;

  if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
    return res.status(400).json({ success: false, message: "Employee IDs are required" });
  }

  try {
    // delete existing
    await db.query("DELETE FROM task_assignments WHERE task_id = ?", [taskId]);

    // insert new
    for (const eid of employee_ids) {
      await db.query("INSERT INTO task_assignments (task_id, employee_id, assigned_at) VALUES (?, ?, NOW())", [taskId, eid]);
    }

    const assignmentRes = await db.query(
      `
      SELECT ta.employee_id, e.name AS employee_name
      FROM task_assignments ta
      JOIN employee e ON ta.employee_id = e.id
      WHERE ta.task_id = ?
    `,
      [taskId]
    );
    const { rows: assigned } = normalizeResult(assignmentRes);

    (assigned || []).forEach((row) => {
      io.to(`user_${row.employee_id}`).emit("taskReassigned", {
        taskId,
        message: `Task #${taskId} has been reassigned`,
      });
    });

    return res.json({
      success: true,
      employee_ids: (assigned || []).map((r) => r.employee_id),
      employee_names: (assigned || []).map((r) => r.employee_name),
    });
  } catch (error) {
    console.error("Error reassigning task:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   DELETE /tasks/:taskId
============================================================ */
router.delete("/:taskId", async (req, res) => {
  const { taskId } = req.params;

  try {
    // notify assigned first
    const assignedBefore = await db.query("SELECT employee_id FROM task_assignments WHERE task_id = ?", [taskId]);
    const { rows: assignedRows } = normalizeResult(assignedBefore);
    (assignedRows || []).forEach((r) => {
      io.to(`user_${r.employee_id}`).emit("taskDeleted", {
        taskId,
        message: `Task #${taskId} has been deleted`,
      });
    });

    await db.query("DELETE FROM task_assignments WHERE task_id = ?", [taskId]);
    const delRes = await db.query("DELETE FROM tasks WHERE task_id = ?", [taskId]);
    const { info: delInfo } = normalizeResult(delRes);

    const affectedRows = delInfo && (delInfo.affectedRows || delInfo.affected_rows);
    if (!affectedRows || affectedRows === 0) {
      // check existence fallback
      const check = await db.query("SELECT * FROM tasks WHERE task_id = ?", [taskId]);
      const { rows: checkRows } = normalizeResult(check);
      if (!checkRows || checkRows.length === 0) {
        return res.status(404).json({ success: false, message: "Task not found" });
      }
    }

    return res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   GET /tasks/list  -> list employees for assignment (employee + category)
============================================================ */
router.get("/list", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT e.id, e.name, c.name AS role
      FROM employee e
      LEFT JOIN category c ON e.category_id = c.id
      ORDER BY e.id ASC
    `
    );
    const { rows } = normalizeResult(result);
    return res.status(200).json({ success: true, employees: rows || [] });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================================================
   GET /tasks?project_id=...
============================================================ */
router.get("/", async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT t.task_id, t.description, t.deadline, t.status, t.project_id, t.created_at, t.updated_at
      FROM tasks t
      WHERE 1=1
    `;
    const params = [];
    if (project_id && !isNaN(parseInt(project_id, 10))) {
      query += " AND t.project_id = ?";
      params.push(parseInt(project_id, 10));
    }

    const tasksRes = await db.query(query, params);
    const { rows: tasks } = normalizeResult(tasksRes);

    const assignmentRes = await db.query(`
      SELECT ta.task_id, ta.employee_id, e.name AS employee_name
      FROM task_assignments ta
      JOIN employee e ON ta.employee_id = e.id
    `);
    const { rows: assignments } = normalizeResult(assignmentRes);

    const grouped = {};
    (assignments || []).forEach((r) => {
      if (!grouped[r.task_id]) grouped[r.task_id] = { employee_ids: [], employee_names: [] };
      grouped[r.task_id].employee_ids.push(r.employee_id);
      grouped[r.task_id].employee_names.push(r.employee_name);
    });

    const finalTasks = (tasks || []).map((t) => ({
      ...t,
      employee_ids: grouped[t.task_id]?.employee_ids || [],
      employee_names: grouped[t.task_id]?.employee_names || [],
    }));

    return res.json({ success: true, tasks: finalTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   GET /tasks/ongoing
============================================================ */
router.get("/ongoing", async (req, res) => {
  try {
    const tasksRes = await db.query(
      `SELECT t.task_id, t.description, t.deadline, t.status, t.project_id, t.created_at, t.updated_at
       FROM tasks t
       WHERE t.status != 'Completed'
       ORDER BY t.deadline ASC`
    );
    const { rows: tasks } = normalizeResult(tasksRes);

    const assignmentRes = await db.query(`
      SELECT ta.task_id, ta.employee_id, e.name AS employee_name
      FROM task_assignments ta
      JOIN employee e ON ta.employee_id = e.id
    `);
    const { rows: assignments } = normalizeResult(assignmentRes);

    const grouped = {};
    (assignments || []).forEach((r) => {
      if (!grouped[r.task_id]) grouped[r.task_id] = { employee_ids: [], employee_names: [] };
      grouped[r.task_id].employee_ids.push(r.employee_id);
      grouped[r.task_id].employee_names.push(r.employee_name);
    });

    const finalTasks = (tasks || []).map((t) => ({
      ...t,
      employee_ids: grouped[t.task_id]?.employee_ids || [],
      employee_names: grouped[t.task_id]?.employee_names || [],
    }));

    return res.json({ success: true, tasks: finalTasks });
  } catch (error) {
    console.error("Error fetching ongoing tasks:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   PATCH /tasks/:taskId/status
============================================================ */
router.patch("/:taskId/status", async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  try {
    const findRes = await db.query("SELECT * FROM tasks WHERE task_id = ?", [taskId]);
    const { rows: found } = normalizeResult(findRes);
    if (!found || found.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await db.query("UPDATE tasks SET status = ?, updated_at = NOW() WHERE task_id = ?", [status, taskId]);

    const updatedRes = await db.query("SELECT * FROM tasks WHERE task_id = ?", [taskId]);
    const { rows: updatedRows } = normalizeResult(updatedRes);
    const updatedTask = (updatedRows && updatedRows[0]) || null;

    const assignedRes = await db.query("SELECT employee_id FROM task_assignments WHERE task_id = ?", [taskId]);
    const { rows: assigned } = normalizeResult(assignedRes);
    (assigned || []).forEach((r) => {
      io.to(`user_${r.employee_id}`).emit("taskUpdated", {
        taskId,
        status,
        message: `Task #${taskId} status changed to ${status}`,
      });
    });

    return res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error updating task status:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ============================================================
   GET /tasks/employee/:employeeId
============================================================ */
router.get("/employee/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  try {
    const tasksRes = await db.query(
      `
      SELECT t.task_id, t.description, t.deadline, t.status, t.project_id, t.created_at, t.updated_at, p.title AS project_title
      FROM tasks t
      JOIN task_assignments ta ON t.task_id = ta.task_id
      LEFT JOIN projects p ON t.project_id = p.project_id
      WHERE ta.employee_id = ?
      ORDER BY t.deadline ASC
    `,
      [employeeId]
    );
    const { rows: tasks } = normalizeResult(tasksRes);
    return res.json({ success: true, tasks: tasks || [] });
  } catch (error) {
    console.error("Error fetching tasks by employee:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

export { router as taskRouter };
