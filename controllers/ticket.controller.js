const db = require("../models/db");



exports.crearTicket = (req, res) => {
  const { solicitante_id, area_id, tipo_atencion_id, observaciones } = req.body;
  const archivo_pdf = req.file ? req.file.filename : null;

  // Paso 1: obtener el ejecutor_id asociado al tipo_atencion_id
  const queryEjecutor = "SELECT ejecutor_id FROM tipo_atencion WHERE id = ?";
  console.log("ID recibido:", tipo_atencion_id);

  db.query(queryEjecutor, [tipo_atencion_id], (err, rows) => {
    console.log("Query ejecutor_id:", err, rows);

    if (err) return res.status(500).json({ message: "Error al consultar tipo de atención", error: err });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "El tipo_atencion_id no existe o no tiene ejecutor asociado." });
    }

    const ejecutor_id = rows[0].ejecutor_id;

    // Paso 2: insertar el ticket con el ejecutor
    const insertTicket = `
      INSERT INTO tickets (solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones, archivo_pdf)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertTicket, [solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones, archivo_pdf], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Error al crear ticket", error: err2 });

      res.json({
        message: "Ticket creado correctamente",
        ticketId: result.insertId
      });
    });
  });
};

exports.editarTicket = (req, res) => {
  const ticketId = req.params.id;
  const { solicitante_id, area_id, tipo_atencion_id, observaciones } = req.body;
  const archivo_pdf = req.file ? req.file.filename : null;

  // Paso 1: obtener el ejecutor_id del nuevo tipo de atención
  const queryEjecutor = "SELECT ejecutor_id FROM tipo_atencion WHERE id = ?";
  
  db.query(queryEjecutor, [tipo_atencion_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error al consultar tipo de atención", error: err });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "El tipo_atencion_id no existe o no tiene ejecutor asociado." });
    }

    const ejecutor_id = rows[0].ejecutor_id;

    // Paso 2: construir la consulta de actualización dinámicamente
    let updateQuery = `
      UPDATE tickets
      SET solicitante_id = ?, area_id = ?, tipo_atencion_id = ?, ejecutor_id = ?, observaciones = ?
    `;
    const params = [solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones];

    if (archivo_pdf) {
      updateQuery += `, archivo_pdf = ?`;
      params.push(archivo_pdf);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(ticketId);

    // Paso 3: ejecutar la actualización
    db.query(updateQuery, params, (err2, result) => {
      if (err2) {
        return res.status(500).json({ message: "Error al actualizar el ticket", error: err2 });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Ticket no encontrado." });
      }

      res.json({ message: "Ticket actualizado correctamente." });
    });
  });
};


exports.cambiarEstado = (req, res) => {
  const { ticket_id } = req.params;
  const { nuevo_estado, observacion, usuario_id } = req.body;

  // Verificar que el usuario sea el ejecutor asignado al ticket
  const queryVerificacion = "SELECT estado, ejecutor_id FROM tickets WHERE id = ?";

  db.query(queryVerificacion, [ticket_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const { estado: estado_anterior, ejecutor_id } = results[0];

    if (usuario_id != ejecutor_id) {
      return res.status(403).json({
        message: "No tienes permisos para cambiar el estado de este ticket. Solo el ejecutor asignado puede hacerlo."
      });
    }

    // Actualizar estado del ticket
    db.query("UPDATE tickets SET estado = ? WHERE id = ?", [nuevo_estado, ticket_id], (err2) => {
      if (err2) {
        return res.status(500).json({ message: "Error al actualizar el estado del ticket" });
      }

      // Insertar en historial
      const queryHistorial = `
        INSERT INTO historial_estado (ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(queryHistorial, [ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id], (err3) => {
        if (err3) {
          return res.status(500).json({ message: "Error al registrar el historial de estado" });
        }

        res.json({ message: "Estado actualizado correctamente" });
      });
    });
  });
};



exports.listarTodos = (req, res) => {
  const query = `
    SELECT t.id, t.estado, t.observaciones, t.archivo_pdf,
           t.fecha_creacion, u.nombre AS solicitante, a.nombre AS area,
           ta.nombre AS tipo_atencion, e.nombre AS ejecutor , e.email AS corre_ejecutor, e.id As id_ejecutor
    FROM tickets t
    JOIN users u ON t.solicitante_id = u.id
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar tickets:", err); // 👈 agrega esto
      return res.status(500).json({ message: "Error al listar todos los tickets" });
    }
        res.json(results);
  });
};

exports.listarPorUsuario = (req, res) => {
  const usuario_id = req.params.usuario_id;

  const queryTickets = `
    SELECT t.id, t.estado, t.observaciones, t.archivo_pdf,
           t.fecha_creacion, a.nombre AS area,
           ta.nombre AS tipo_atencion, e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
    WHERE t.solicitante_id = ?
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(queryTickets, [usuario_id], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del usuario", error: err });

    if (tickets.length === 0) return res.json([]); // sin tickets

    // Obtener los IDs de los tickets para traer los historiales en un solo query
    const ticketIds = tickets.map(t => t.id);

    const queryHistorial = `
      SELECT h.ticket_id, h.estado_anterior, h.nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      WHERE h.ticket_id IN (?)
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketIds], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      // Organizar historial por ticket_id
      const historialPorTicket = {};
      historiales.forEach(h => {
        if (!historialPorTicket[h.ticket_id]) historialPorTicket[h.ticket_id] = [];
        historialPorTicket[h.ticket_id].push({
          estado_anterior: h.estado_anterior,
          nuevo_estado: h.nuevo_estado,
          observacion: h.observacion,
          fecha: h.fecha,
          usuario_cambio: h.usuario_cambio
        });
      });

      // Agregar el historial a cada ticket
      const respuesta = tickets.map(ticket => ({
        ...ticket,
        historial: historialPorTicket[ticket.id] || []
      }));

      res.json(respuesta);
    });
  });
};
