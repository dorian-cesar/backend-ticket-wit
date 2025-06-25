//const db = require("../db"); // Asegúrate de tener el pool o conexión
const db = require("../models/db");

exports.listarEstados = (req, res) => {
  db.query("SELECT * FROM estados_ticket ORDER BY id", (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al listar estados" });
    res.json(rows);
  });
};

exports.obtenerEstado = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM estados_ticket WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener estado" });
    if (rows.length === 0) return res.status(404).json({ message: "Estado no encontrado" });
    res.json(rows[0]);
  });
};

exports.crearEstado = (req, res) => {
  const { nombre } = req.body;
  db.query("INSERT INTO estados_ticket (nombre) VALUES (?)", [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: "Error al crear estado" });
    res.status(201).json({ message: "Estado creado", id: result.insertId });
  });
};

exports.actualizarEstado = (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  db.query("UPDATE estados_ticket SET nombre = ? WHERE id = ?", [nombre, id], (err) => {
    if (err) return res.status(500).json({ error: "Error al actualizar estado" });
    res.json({ message: "Estado actualizado" });
  });
};

exports.eliminarEstado = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM estados_ticket WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar estado" });
    res.json({ message: "Estado eliminado" });
  });
};

