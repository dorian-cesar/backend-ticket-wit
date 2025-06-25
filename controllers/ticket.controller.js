const db = require("../models/db");



const nodemailer = require("nodemailer");
//const db = require("../db"); // Ajusta si tu conexión está en otro archivo
/*
exports.crearTicket = (req, res) => {
  const { solicitante_id, area_id, tipo_atencion_id, observaciones } = req.body;
  const archivo_pdf = req.file ? req.file.filename : null;

  // Paso 1: obtener el ejecutor_id asociado al tipo_atencion_id
  const queryEjecutor = "SELECT ejecutor_id FROM tipo_atencion WHERE id = ?";

  db.query(queryEjecutor, [tipo_atencion_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error al consultar tipo de atención", error: err });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "El tipo_atencion_id no existe o no tiene ejecutor asociado." });
    }

    const ejecutor_id = rows[0].ejecutor_id;

    // Paso 2: obtener el email del ejecutor
    const queryEmail = "SELECT email, nombre FROM users WHERE id = ?";
    db.query(queryEmail, [ejecutor_id], (err2, userRows) => {
      if (err2) {
        return res.status(500).json({ message: "Error al consultar usuario ejecutor", error: err2 });
      }

      if (!userRows || userRows.length === 0) {
        return res.status(400).json({ message: "No se encontró usuario ejecutor." });
      }

      const { email: ejecutorEmail, nombre: ejecutorNombre } = userRows[0];

      // Paso 3: insertar el ticket
      const insertTicket = `
        INSERT INTO tickets (solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones, archivo_pdf)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(insertTicket, [solicitante_id, area_id, tipo_atencion_id, ejecutor_id, observaciones, archivo_pdf], (err3, result) => {
        if (err3) {
          return res.status(500).json({ message: "Error al crear ticket", error: err3 });
        }

        // Paso 4: enviar correo al ejecutor
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const ticketId = result.insertId;

        const mailOptions = {
          from: `"Sistema de Soporte" <${process.env.EMAIL_USER}>`,
          to: ejecutorEmail,
          subject: `Nuevo ticket asignado (Ticket #${ticketId})`,
          html: `
    <p>Hola ${ejecutorNombre},</p>
    <p>Se te ha asignado un nuevo ticket de atención.</p>
    <p><strong>Número de Ticket:</strong> ${ticketId}</p>
    <p><strong>Observaciones:</strong> ${observaciones}</p>
    <p>Revisa el sistema para más información <a href="https://soporte.dev-wit.com/">aquí</a>.</p>
  `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error al enviar el correo:", error);
          } else {
            console.log("Correo enviado: " + info.response);
          }

          res.json({
            message: "Ticket creado correctamente y correo enviado al ejecutor.",
            ticketId: result.insertId
          });
        });
      });
    });
  });
};
*/


exports.crearTicket = (req, res) => {
  const { solicitante_id, area_id, tipo_atencion_id, observaciones } = req.body;
  const archivo_pdf = req.file ? req.file.filename : null;

  // Paso 1: obtener ejecutor_id desde tipo_atencion
  const queryEjecutor = "SELECT ejecutor_id FROM tipo_atencion WHERE id = ?";
  db.query(queryEjecutor, [tipo_atencion_id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(400).json({ message: "Error al obtener ejecutor_id desde tipo_atencion" });
    }

    const ejecutor_id = rows[0].ejecutor_id;

    // Paso 2: obtener id_jefatura, nombre y correo desde el solicitante
    const queryJefatura = `
      SELECT j.id AS id_jefatura, j.email AS email_jefatura, j.nombre AS nombre_jefatura
      FROM users s
      JOIN users j ON s.id_jefatura = j.id
      WHERE s.id = ?
    `;

    db.query(queryJefatura, [solicitante_id], (err2, jefaturaRows) => {
      if (err2 || jefaturaRows.length === 0) {
        return res.status(400).json({ message: "No se encontró jefatura para el solicitante" });
      }

      const { id_jefatura, email_jefatura, nombre_jefatura } = jefaturaRows[0];

      // Paso 3: insertar el ticket (sin id_estado, usará valor por defecto)
      const insertTicket = `
        INSERT INTO tickets (
          solicitante_id, area_id, tipo_atencion_id,
          ejecutor_id, id_jefatura, observaciones, archivo_pdf
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        solicitante_id,
        area_id,
        tipo_atencion_id,
        ejecutor_id,
        id_jefatura,
        observaciones,
        archivo_pdf
      ];

      db.query(insertTicket, values, (err3, result) => {
        if (err3) {
          return res.status(500).json({ message: "Error al crear ticket", error: err3 });
        }

        const ticketId = result.insertId;

        // Paso 4: enviar correo a la jefatura
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: `"Sistema de Soporte" <${process.env.EMAIL_USER}>`,
          to: email_jefatura,
          subject: `Nuevo ticket generado para su supervisión (Ticket #${ticketId})`,
          html: `
            <p>Hola ${nombre_jefatura},</p>
            <p>Se ha generado un nuevo ticket desde su equipo.</p>
            <p><strong>Número de Ticket:</strong> ${ticketId}</p>
            <p><strong>Observaciones:</strong> ${observaciones}</p>
            <p>Revisa el sistema para más información: <a href="https://mesa-de-ayuda.dev-wit.com/">Ver ticket</a></p>
          `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error al enviar correo a jefatura:", error);
          } else {
            console.log("Correo enviado a jefatura:", info.response);
          }

          res.json({
            message: "Ticket creado correctamente y correo enviado a la jefatura.",
            ticketId
          });
        });
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

  // Paso 1: Verificar que el usuario es el ejecutor y obtener solicitante_id
  const queryVerificacion = "SELECT estado, ejecutor_id, solicitante_id FROM tickets WHERE id = ?";

  db.query(queryVerificacion, [ticket_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const { estado: estado_anterior, ejecutor_id, solicitante_id } = results[0];

    if (usuario_id != ejecutor_id) {
      return res.status(403).json({
        message: "No tienes permisos para cambiar el estado de este ticket. Solo el ejecutor asignado puede hacerlo."
      });
    }

    // Paso 2: Actualizar el estado del ticket
    db.query("UPDATE tickets SET estado = ? WHERE id = ?", [nuevo_estado, ticket_id], (err2) => {
      if (err2) {
        return res.status(500).json({ message: "Error al actualizar el estado del ticket" });
      }

      // Paso 3: Insertar en historial
      const queryHistorial = `
        INSERT INTO historial_estado (ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(queryHistorial, [ticket_id, estado_anterior, nuevo_estado, observacion, usuario_id], (err3) => {
        if (err3) {
          return res.status(500).json({ message: "Error al registrar el historial de estado" });
        }

        // Paso 4: Obtener correo del solicitante
        const queryEmail = "SELECT email, nombre FROM users WHERE id = ?";
        db.query(queryEmail, [solicitante_id], (err4, userRows) => {
          if (err4 || userRows.length === 0) {
            return res.status(500).json({ message: "Error al obtener datos del solicitante" });
          }

          const { email: solicitanteEmail, nombre: solicitanteNombre } = userRows[0];

          // Paso 5: Enviar correo al solicitante
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });

          const mailOptions = {
            from: `"Sistema de Soporte" <${process.env.EMAIL_USER}>`,
            to: solicitanteEmail,
            subject: `Estado actualizado del ticket #${ticket_id}`,
            html: `
              <p>Hola ${solicitanteNombre},</p>
              <p>El estado de tu ticket <strong>#${ticket_id}</strong> ha sido actualizado.</p>
              <p><strong>Nuevo estado:</strong> ${nuevo_estado}</p>
              <p><strong>Observación:</strong> ${observacion}</p>
              <p>Revisa el sistema para más información <a href="https://soporte.dev-wit.com/">aqui</a>.</p>

            `
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Error al enviar correo:", error);
              // No detenemos el flujo por error de correo
            }
            console.log(solicitanteEmail);
            res.json({ message: "Estado actualizado y correo enviado al solicitante." });
          });
        });
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
    SELECT t.id, t.id_estado, t.observaciones, t.archivo_pdf,
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
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
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

exports.listarPorEjecutor = (req, res) => {
  const ejecutor_id = req.params.ejecutor_id;

  const queryTickets = `
    SELECT t.id, t.estado, t.observaciones, t.archivo_pdf,
           t.fecha_creacion, a.nombre AS area,
           ta.nombre AS tipo_atencion,
           s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    WHERE t.ejecutor_id = ?
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(queryTickets, [ejecutor_id], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del ejecutor", error: err });

    if (tickets.length === 0) return res.json([]); // sin tickets

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

      const respuesta = tickets.map(ticket => ({
        ...ticket,
        historial: historialPorTicket[ticket.id] || []
      }));

      res.json(respuesta);
    });
  });
};
