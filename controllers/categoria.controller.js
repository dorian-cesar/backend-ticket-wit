const db = require("../models/db");

// Listar todas las categorías
exports.listarCategorias = (req, res) => {
  db.query("SELECT * FROM categorias ORDER BY id", (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener categorías", error: err });
    res.json(results);
  });
};

// Obtener una categoría por ID
exports.obtenerCategoria = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM categorias WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener la categoría", error: err });
    if (results.length === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(results[0]);
  });
};

// Crear una nueva categoría
exports.crearCategoria = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ message: "El nombre es requerido" });

  db.query("INSERT INTO categorias (nombre) VALUES (?)", [nombre], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al crear categoría", error: err });
    res.status(201).json({ id: result.insertId, nombre });
  });
};

// Actualizar una categoría
exports.actualizarCategoria = (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ message: "El nombre es requerido" });

  db.query("UPDATE categorias SET nombre = ? WHERE id = ?", [nombre, id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al actualizar categoría", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json({ id, nombre });
  });
};

// Eliminar una categoría
exports.eliminarCategoria = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM categorias WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar categoría", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json({ message: "Categoría eliminada correctamente" });
  });
};
