const db = require("../models/db");

exports.listarTipos = (req, res) => {
  db.query(`
    SELECT ta.id, ta.nombre, ta.area_id, a.nombre AS area_nombre, u.nombre AS ejecutor_nombre, u.id AS ejecutor_id, c.nombre AS categoria
    FROM tipo_atencion ta
    JOIN areas a ON ta.area_id = a.id
    JOIN users u ON ta.ejecutor_id = u.id
     JOIN categorias c ON ta.categoria_id = c.id

  `, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al listar tipos" });
    res.json(results);
  });
};

exports.crearTipo = (req, res) => {
  const { nombre, area_id, ejecutor_id, categoria_id } = req.body;
  db.query("INSERT INTO tipo_atencion (nombre, area_id, ejecutor_id, categoria_id ) VALUES (?, ?, ?, ?)",
    [nombre, area_id, ejecutor_id, categoria_id], (err) => {
      if (err) return res.status(500).json({ error: "Error al crear tipo" });
      res.json({ message: "Tipo de atención creado" });
    });
};

exports.editarTipo = (req, res) => {
  const { id } = req.params;
  const { nombre, area_id, ejecutor_id, categoria_id } = req.body;
  db.query("UPDATE tipo_atencion SET nombre = ?, area_id = ?, ejecutor_id = ?, categoria_id =? WHERE id = ?",
    [nombre, area_id, ejecutor_id, categoria_id, id], (err) => {
      if (err) return res.status(500).json({ error: "Error al editar tipo" });
      res.json({ message: "Tipo de atención actualizado" });
    });
};

exports.borrarTipo = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM tipo_atencion WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar tipo" });
    res.json({ message: "Tipo de atención eliminado" });
  });
};
