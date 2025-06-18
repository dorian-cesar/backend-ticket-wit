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