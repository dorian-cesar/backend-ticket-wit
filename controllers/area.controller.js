const db = require("../models/db");

exports.listarAreas = (req, res) => {
  db.query("SELECT * FROM areas", (err, results) => {
    if (err) return res.status(500).json({ error: "Error al listar áreas" });
    res.json(results);
  });
};

exports.crearArea = (req, res) => {
  const { nombre } = req.body;
  db.query("INSERT INTO areas (nombre) VALUES (?)", [nombre], (err) => {
    if (err) return res.status(500).json({ error: "Error al crear área" });
    res.json({ message: "Área creada" });
  });
};

exports.editarArea = (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  db.query("UPDATE areas SET nombre = ? WHERE id = ?", [nombre, id], (err) => {
    if (err) return res.status(500).json({ error: "Error al editar área" });
    res.json({ message: "Área actualizada" });
  });
};

exports.borrarArea = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM areas WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar área" });
    res.json({ message: "Área eliminada" });
  });
};
