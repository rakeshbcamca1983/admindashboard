import express from "express";
import db from "../utils/db.js";

const router = express.Router();

/* ===============================================
    GET ALL CLIENTS  (WORKING MYSQL VERSION)
================================================*/
router.get("/", async (req, res) => {
  try {
    const clients = await db.query(
      "SELECT * FROM clients ORDER BY client_id ASC"
    );

    res.status(200).json({
      success: true,
      clients: clients, // NO .rows
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ===============================================
    ADD NEW CLIENT   (WORKING MYSQL VERSION)
================================================*/
router.post("/", async (req, res) => {
  const { name, contact_person, email, phone, address } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and email are required",
    });
  }

  try {
    const insertResult = await db.query(
      "INSERT INTO clients (name, contact_person, email, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [name, contact_person, email, phone, address]
    );

    const insertedClient = await db.query(
      "SELECT * FROM clients WHERE client_id = ?",
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      client: insertedClient[0], // NO .rows
    });

  } catch (error) {
    console.error("Error adding client:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ===============================================
    DELETE CLIENT   (WORKING MYSQL VERSION)
================================================*/
router.delete("/:clientId", async (req, res) => {
  const { clientId } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM clients WHERE client_id = ?",
      [clientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

export { router as clientsRouter };
