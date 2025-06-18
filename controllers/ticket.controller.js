const db = require("../models/db");

exports.crearTicket = (req, res) => {
  const { solicitante_id, area_id, tipo_atencion_id, observaciones } = req.body;
  const archivo_pdf = req.file ? req.file.filename : null;

  const query = `
    INSERT INTO tickets (solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones, archivo_pdf)
    SELECT ?, ?, ?, t.ejecutor_id, ?, ?
    FROM tipo_atencion t WHERE t.id = ?
  `;

  db.query(query, [solicitante_id, area_id, tipo_atencion_id, observaciones, archivo_pdf, tipo_atencion_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al crear ticket" });
    res.json({ message: "Ticket creado correctamente", ticketId: result.insertId });
  });
};

exports.cambiarEstado = (req, res) => {
  const { ticket_id } = req.params;
  const { nuevo_estado, observacion, usuario_id } = req.body;

  db.query("SELECT estado FROM tickets WHERE id = ?", [ticket_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "Ticket no encontrado" });

    const estado_anterior = results[0].estado;

    db.query("UPDATE tickets SET estado = ? WHERE id = ?", [nuevo_estado, ticket_id], (err2) => {
      if (err2) return res.status(500).json({ message: "Error al actualizar" });

      db.query("INSERT INTO historial_estado (ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id) VALUES (?, ?, ?, ?, ?)",
        [ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id],
        () => res.json({ message: "Estado actualizado" })
      );
    });
  });
};

exports.listarTodos = (req, res) => {
  const query = `
    SELECT t.id, t.estado, t.observaciones, t.archivo_pdf,
           t.created_at, u.nombre AS solicitante, a.nombre AS area,
           ta.nombre AS tipo_atencion, e.nombre AS ejecutor
    FROM tickets t
    JOIN users u ON t.solicitante_id = u.id
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
    ORDER BY t.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Error al listar todos los tickets" });
    res.json(results);
  });
};

exports.listarPorUsuario = (req, res) => {
  const usuario_id = req.params.usuario_id;

  const query = `
    SELECT t.id, t.estado, t.observaciones, t.archivo_pdf,
           t.created_at, a.nombre AS area,
           ta.nombre AS tipo_atencion, e.nombre AS ejecutor
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
    WHERE t.solicitante_id = ?
    ORDER BY t.created_at DESC
  `;

  db.query(query, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del usuario" });
    res.json(results);
  });
};