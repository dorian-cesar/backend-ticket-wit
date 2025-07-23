//const db = require('../config/db');
const db = require("../models/db");

// Crear actividad
exports.crearActividad = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ message: "Nombre requerido" });

  db.query("INSERT INTO actividad_realizada (nombre) VALUES (?)", [nombre], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al crear actividad", error: err });
    res.json({ message: "Actividad creada", id: result.insertId });
  });
};

// Listar todas
exports.listarActividades = (req, res) => {
  db.query("SELECT * FROM actividad_realizada", (err, rows) => {
    if (err) return res.status(500).json({ message: "Error al obtener actividades", error: err });
    res.json(rows);
  });
};

// Obtener una por ID
exports.obtenerActividad = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM actividad_realizada WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error al buscar actividad", error: err });
    if (rows.length === 0) return res.status(404).json({ message: "Actividad no encontrada" });
    res.json(rows[0]);
  });
};

// Actualizar
exports.actualizarActividad = (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  db.query("UPDATE actividad_realizada SET nombre = ? WHERE id = ?", [nombre, id], (err) => {
    if (err) return res.status(500).json({ message: "Error al actualizar actividad", error: err });
    res.json({ message: "Actividad actualizada" });
  });
};

// Eliminar
exports.eliminarActividad = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM actividad_realizada WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Error al eliminar actividad", error: err });
    res.json({ message: "Actividad eliminada" });
  });
};

// Obtener actividades por tipo_atencion_id
exports.obtenerPorTipoAtencion = (req, res) => {
  const { tipo_atencion_id } = req.params;

  if (!tipo_atencion_id) {
    return res.status(400).json({ message: "tipo_atencion_id requerido" });
  }

  db.query(
    "SELECT * FROM actividad_realizada WHERE tipo_atencion_id = ?",
    [tipo_atencion_id],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Error al obtener actividades", error: err });

      res.json(rows);
    }
  );
};
