const db = require('../models/db');

// Crear dirección
exports.crearDireccion = (req, res) => {
  const { name, ubicacion } = req.body;

  if (!name || !ubicacion) {
    return res.status(400).json({ message: "Los campos 'name' y 'ubicacion' son obligatorios" });
  }

  const query = `INSERT INTO direcciones (name, ubicacion) VALUES (?, ?)`;
  db.query(query, [name, ubicacion], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al crear dirección", error: err });

    res.json({ message: "Dirección creada", id: result.insertId });
  });
};

// Obtener todas las direcciones
exports.listarDirecciones = (req, res) => {
  const query = `SELECT * FROM direcciones ORDER BY id DESC`;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ message: "Error al listar direcciones", error: err });

    res.json(rows);
  });
};

// Obtener una dirección por ID
exports.obtenerDireccion = (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM direcciones WHERE id = ?`;
  db.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error al buscar dirección", error: err });
    if (rows.length === 0) return res.status(404).json({ message: "Dirección no encontrada" });

    res.json(rows[0]);
  });
};

// Actualizar dirección
exports.actualizarDireccion = (req, res) => {
  const { id } = req.params;
  const { name, ubicacion } = req.body;

  if (!name || !ubicacion) {
    return res.status(400).json({ message: "Los campos 'name' y 'ubicacion' son obligatorios" });
  }

  const query = `UPDATE direcciones SET name = ?, ubicacion = ? WHERE id = ?`;
  db.query(query, [name, ubicacion, id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al actualizar dirección", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Dirección no encontrada" });

    res.json({ message: "Dirección actualizada correctamente" });
  });
};

// Eliminar dirección
exports.eliminarDireccion = (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM direcciones WHERE id = ?`;
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar dirección", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Dirección no encontrada" });

    res.json({ message: "Dirección eliminada correctamente" });
  });
};
