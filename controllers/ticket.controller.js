const db = require("../models/db");

const nodemailer = require("nodemailer");

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path'); 

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

// Eliminar ticket por ID
exports.eliminarTicket = (req, res) => {
  const { id } = req.params;

  const deleteQuery = "DELETE FROM tickets WHERE id = ?";

  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error al eliminar el ticket", error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Ticket no encontrado." });
    }

    res.json({ message: "Ticket eliminado correctamente." });
  });
};


exports.listarTodos = (req, res) => {

  // const ejecutor_id = req.params.ejecutor_id;

  const queryTickets = `
    SELECT 
      t.id, t.id_estado, t.observaciones, t.archivo_pdf, t.fecha_creacion,
      t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
      t.necesita_despacho, t.detalles_despacho, t.archivo_solucion,
      t.aprobacion_solucion, t.solucion_observacion,
      t.tipo_atencion_id, 
      t.direcciones_id,
      a.nombre AS area,
      ta.nombre AS tipo_atencion,
      s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante,
      e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor,
      d.name AS direccion_nombre,
      d.ubicacion AS direccion_ubicacion
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    LEFT JOIN direcciones d ON t.direcciones_id = d.id
    ORDER BY t.fecha_creacion DESC
  `;

  

  db.query(queryTickets,  (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del ejecutor", error: err });

    if (tickets.length === 0) return res.json([]); // sin tickets

    const ticketIds = tickets.map(t => t.id);

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id IN (?)
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketIds], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historialPorTicket = {};
      historiales.forEach(h => {
        if (!historialPorTicket[h.ticket_id]) historialPorTicket[h.ticket_id] = [];
        historialPorTicket[h.ticket_id].push({
          estado_anterior: h.id_estado_anterior || 'N/A',
          nuevo_estado: h.id_nuevo_estado || 'N/A',
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

exports.listarPorUsuario = (req, res) => {
  const usuario_id = req.params.usuario_id;

  const queryTickets = `
  SELECT 
      t.id, t.id_estado, t.observaciones, t.archivo_pdf,
      t.fecha_creacion, t.aprobacion_solucion, t.solucion_observacion,
      a.nombre AS area,
      ta.nombre AS tipo_atencion,
      e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor,
      t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
      t.necesita_despacho, t.detalles_despacho, t.archivo_solucion,
      t.tipo_atencion_id,
      t.direcciones_id,
      d.name AS direccion_nombre,
      d.ubicacion AS direccion_ubicacion
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    LEFT JOIN direcciones d ON t.direcciones_id = d.id
    WHERE t.solicitante_id = ?
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(queryTickets, [usuario_id], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del usuario", error: err });

    if (tickets.length === 0) return res.json([]);

    const ticketIds = tickets.map(t => t.id);

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id IN (?)
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketIds], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historialPorTicket = {};
      historiales.forEach(h => {
        if (!historialPorTicket[h.ticket_id]) historialPorTicket[h.ticket_id] = [];
        historialPorTicket[h.ticket_id].push({
          estado_anterior: h.id_estado_anterior || 'N/A',
          nuevo_estado: h.id_nuevo_estado || 'N/A',
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


exports.listarPorEjecutor = (req, res) => {
  const ejecutor_id = req.params.ejecutor_id;

  const queryTickets = `
    SELECT t.id, t.id_estado, t.observaciones, t.archivo_pdf, t.fecha_creacion, 
           t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion,
           t.aprobacion_solucion, t.solucion_observacion,
           t.tipo_atencion_id,  -- <<< ahora incluimos este campo directamente desde la tabla tickets
           t.ejecutor_id,
           a.nombre AS area,
           ta.nombre AS tipo_atencion,
           s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    WHERE t.ejecutor_id = ? OR t.solicitante_id = ?
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(queryTickets, [ejecutor_id, ejecutor_id], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets del ejecutor", error: err });

    if (tickets.length === 0) return res.json([]);

    const ticketIds = tickets.map(t => t.id);

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id IN (?)
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketIds], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historialPorTicket = {};
      historiales.forEach(h => {
        if (!historialPorTicket[h.ticket_id]) historialPorTicket[h.ticket_id] = [];
        historialPorTicket[h.ticket_id].push({
          estado_anterior: h.id_estado_anterior || 'N/A',
          nuevo_estado: h.id_nuevo_estado || 'N/A',
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




exports.autorizarORechazarTicket = (req, res) => {
  const { ticket_id } = req.params;
  const { id_estado, observacion, usuario_id } = req.body; // id_estado: 2 (autorizado), 9 (rechazado)

  // Validar id_estado
  if (![2, 9].includes(id_estado)) {
    return res.status(400).json({ message: "id_estado inválido. Solo se permite 2 (autorizar) o 9 (rechazar)" });
  }

  // Obtener datos actuales del ticket
  const queryDatos = `
    SELECT t.id_estado AS estado_anterior, t.solicitante_id, t.ejecutor_id,
           us.email AS email_solicitante, us.nombre AS nombre_solicitante,
           ue.email AS email_ejecutor, ue.nombre AS nombre_ejecutor
    FROM tickets t
    JOIN users us ON t.solicitante_id = us.id
    JOIN users ue ON t.ejecutor_id = ue.id
    WHERE t.id = ?
  `;

  db.query(queryDatos, [ticket_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const {
      estado_anterior,
      solicitante_id,
      ejecutor_id,
      email_solicitante,
      nombre_solicitante,
      email_ejecutor,
      nombre_ejecutor
    } = results[0];

    // Actualizar el ticket con el nuevo estado
    db.query(
      "UPDATE tickets SET id_estado = ? WHERE id = ?",
      [id_estado, ticket_id],
      (err2) => {
        if (err2) {
          return res.status(500).json({ message: "Error al actualizar ticket" });
        }

        // Registrar en historial
        const insertHistorial = `
          INSERT INTO historial_estado (
            ticket_id, id_estado_anterior, id_nuevo_estado,
            observacion, usuario_id
          ) VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
          insertHistorial,
          [ticket_id, estado_anterior, id_estado, observacion, usuario_id],
          (err3) => {
            if (err3) {
              return res.status(500).json({ message: "Error al registrar historial" });
            }

            // Enviar correo
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
              }
            });

            let correoDestino, nombreDestino, asunto, cuerpoHtml;

            if (id_estado === 9) { // rechazado
              correoDestino = email_solicitante;
              nombreDestino = nombre_solicitante;
              asunto = `Ticket #${ticket_id} rechazado`;
              cuerpoHtml = `
                <p>Hola ${nombreDestino},</p>
                <p>Su solicitud fue <strong>rechazada</strong>.</p>
                <p><strong>Motivo:</strong> ${observacion}</p>
                <p>Ticket: #${ticket_id}</p>
              `;
            } else if (id_estado === 2) { // autorizado
              correoDestino = email_ejecutor;
              nombreDestino = nombre_ejecutor;
              asunto = `Ticket #${ticket_id} autorizado y asignado`;
              cuerpoHtml = `
                <p>Hola ${nombreDestino},</p>
                <p>Se le ha asignado un nuevo ticket para atención.</p>
                <p><strong>Ticket:</strong> #${ticket_id}</p>
                <p>Revise el sistema para más información.</p>
              `;
            }

            const mailOptions = {
              from: `"Sistema de Soporte" <${process.env.EMAIL_USER}>`,
              to: correoDestino,
              subject: asunto,
              html: cuerpoHtml
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error("Error al enviar correo:", error);
              }

              res.json({
                message: `Ticket ${id_estado === 2 ? "autorizado" : "rechazado"} correctamente`,
                ticket_id
              });
            });
          }
        );
      }
    );
  });
};


exports.cambiarEstado = (req, res) => {
  const { ticket_id } = req.params;
  const { id_nuevo_estado, observacion, usuario_id } = req.body;

  // Paso 1: Verificar que el usuario es el ejecutor y obtener solicitante_id e id_estado actual
  const queryVerificacion = `
    SELECT id_estado AS id_estado_anterior, ejecutor_id, solicitante_id
    FROM tickets
    WHERE id = ?
  `;

  db.query(queryVerificacion, [ticket_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const { id_estado_anterior, ejecutor_id, solicitante_id } = results[0];

    if (usuario_id != ejecutor_id) {
      return res.status(403).json({
        message: "No tienes permisos para cambiar el estado de este ticket. Solo el ejecutor asignado puede hacerlo."
      });
    }

    // Paso 2: Actualizar el estado en el ticket
    db.query(
      "UPDATE tickets SET id_estado = ? WHERE id = ?",
      [id_nuevo_estado, ticket_id],
      (err2) => {
        if (err2) {
          return res.status(500).json({ message: "Error al actualizar el estado del ticket" });
        }

        // Paso 3: Insertar en historial_estado
        const queryHistorial = `
          INSERT INTO historial_estado (ticket_id, id_estado_anterior, id_nuevo_estado, observacion, usuario_id)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
          queryHistorial,
          [ticket_id, id_estado_anterior, id_nuevo_estado, observacion, usuario_id],
          (err3) => {
            if (err3) {
              return res.status(500).json({ message: "Error al registrar el historial de estado" });
            }

            // Paso 4: Obtener email del solicitante
            const queryEmailSolicitante = `
              SELECT email, nombre FROM users WHERE id = ?
            `;
            db.query(queryEmailSolicitante, [solicitante_id], (err4, userRows) => {
              if (err4 || userRows.length === 0) {
                return res.status(500).json({ message: "Error al obtener datos del solicitante" });
              }

              const { email: solicitanteEmail, nombre: solicitanteNombre } = userRows[0];

              // Paso 5: Obtener nombre del nuevo estado
              const queryEstadoNombre = `
                SELECT nombre FROM estados_ticket WHERE id = ?
              `;
              db.query(queryEstadoNombre, [id_nuevo_estado], (err5, estadoRows) => {
                const nombreEstado = (!err5 && estadoRows.length > 0)
                  ? estadoRows[0].nombre
                  : `Estado ID ${id_nuevo_estado}`;

                // Paso 6: Enviar correo al solicitante
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
                  subject: `Actualización de estado del Ticket #${ticket_id}`,
                  html: `
                    <p>Hola ${solicitanteNombre},</p>
                    <p>El estado de tu ticket <strong>#${ticket_id}</strong> ha sido actualizado.</p>
                    <p><strong>Nuevo estado:</strong> ${nombreEstado}</p>
                    <p><strong>Observación:</strong> ${observacion}</p>
                    <p>Revisa el sistema para más información <a href="https://mesa-de-ayuda.dev-wit.com/">aquí</a>.</p>
                  `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error("Error al enviar el correo:", error);
                    // No se interrumpe la respuesta si falla el correo
                  }

                  res.json({
                    message: "Estado actualizado y correo enviado al solicitante.",
                    nuevo_estado: id_nuevo_estado
                  });
                });
              });
            });
          }
        );
      }
    );
  });
};





exports.ticketsPorJefaturaPendientes = (req, res) => {
  const id_jefatura = req.params.id_jefatura;

  const queryTickets = `
    SELECT t.id, t.id_estado, t.observaciones, t.archivo_pdf, t.fecha_creacion,
           t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion,t.aprobacion_solucion, t.solucion_observacion,
           a.nombre AS area,
           ta.nombre AS tipo_atencion,
           s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante,
           e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    WHERE t.id_jefatura = ?
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(queryTickets, [id_jefatura], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al listar tickets por jefatura", error: err });

    if (tickets.length === 0) return res.json([]); // sin tickets

    const ticketIds = tickets.map(t => t.id);

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id IN (?)
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketIds], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historialPorTicket = {};
      historiales.forEach(h => {
        if (!historialPorTicket[h.ticket_id]) historialPorTicket[h.ticket_id] = [];
        historialPorTicket[h.ticket_id].push({
          estado_anterior: h.id_estado_anterior || 'N/A',
          nuevo_estado: h.id_nuevo_estado || 'N/A',
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



exports.cerrarTicket = (req, res) => {
  const { ticket_id } = req.params;
  const {
    id_actividad,
    detalle_solucion,
    tipo_atencion, // 'remota' o 'presencial'
    necesita_despacho,
    detalles_despacho,
    usuario_id
  } = req.body;

  const archivo_solucion = req.file ? req.file.filename : null;

  const getTicketInfo = `
    SELECT t.id_estado, t.solicitante_id, t.ejecutor_id,
           us.email AS email_solicitante, us.nombre AS nombre_solicitante,
           ue.email AS email_ejecutor, ue.nombre AS nombre_ejecutor
    FROM tickets t
    JOIN users us ON t.solicitante_id = us.id
    JOIN users ue ON t.ejecutor_id = ue.id
    WHERE t.id = ?
  `;

  db.query(getTicketInfo, [ticket_id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const {
      id_estado: id_estado_anterior,
      email_solicitante,
      nombre_solicitante,
      email_ejecutor,
      nombre_ejecutor
    } = result[0];

    const updateTicket = `
      UPDATE tickets
      SET id_actividad = ?,
          detalle_solucion = ?,
          tipo_atencion = ?,
          necesita_despacho = ?,
          detalles_despacho = ?,
          archivo_solucion = ?,
          id_estado = 6
      WHERE id = ?
    `;

    db.query(
      updateTicket,
      [
        id_actividad,
        detalle_solucion,
        tipo_atencion,
        necesita_despacho,
        necesita_despacho === 'si' ? detalles_despacho : null,
        archivo_solucion,
        ticket_id
      ],
      (err2) => {
        if (err2) {
          return res.status(500).json({ message: "Error al cerrar ticket" });
        }

        const insertHistorial = `
          INSERT INTO historial_estado (
            ticket_id, id_estado_anterior, id_nuevo_estado,
            observacion, usuario_id, archivo_pdf
          ) VALUES (?, ?, 6, ?, ?, ?)
        `;

        db.query(
          insertHistorial,
          [ticket_id, id_estado_anterior, detalle_solucion, usuario_id, archivo_solucion],
          (err3) => {
            if (err3) {
              return res.status(500).json({ message: "Error al registrar historial" });
            }

            // 🔔 Enviar correo
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
              }
            });

            const asunto = `Ticket #${ticket_id} cerrado`;
            const cuerpoHtml = `
              <p>El ticket #${ticket_id} ha sido cerrado.</p>
              <p><strong>Detalle de la solución:</strong> ${detalle_solucion}</p>
              <p><strong>Tipo de atención:</strong> ${tipo_atencion}</p>
              <p><strong>Requiere despacho:</strong> ${necesita_despacho}</p>
              ${
                necesita_despacho === 'si'
                  ? `<p><strong>Detalles del despacho:</strong> ${detalles_despacho}</p>`
                  : ""
              }
            `;

            const mailOptions = {
              from: `"Sistema de Soporte" <${process.env.EMAIL_USER}>`,
              to: `${email_solicitante}, ${email_ejecutor}`,
              subject: asunto,
              html: cuerpoHtml
            };
            //console.log(email_solicitante);

            transporter.sendMail(mailOptions, (err4) => {
              if (err4) {
                console.error("Error al enviar correo de cierre:", err4);
                return res.status(500).json({ message: "Ticket cerrado pero error al enviar notificación" });
              }

              res.json({ message: "Ticket cerrado y notificación enviada correctamente" });
            });
          }
        );
      }
    );
  });
};


const moment = require('moment');



const puppeteer = require('puppeteer');


exports.generarInformePDF = async (req, res) => {
  const { ticket_id } = req.params;

  const queryTicket = `
    SELECT t.*, 
           u.nombre AS solicitante_nombre, 
           e.nombre AS ejecutor_nombre, 
           a.nombre AS actividad_nombre,
           ar.nombre AS area_nombre,
           ta.nombre AS tipo_atencion_nombre
    FROM tickets t
    LEFT JOIN users u ON t.solicitante_id = u.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    LEFT JOIN actividad_realizada a ON t.id_actividad = a.id
    LEFT JOIN areas ar ON t.area_id = ar.id
    LEFT JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    WHERE t.id = ? AND t.id_estado = 6
  `;

  db.query(queryTicket, [ticket_id], async (err, ticketResults) => {
    if (err || ticketResults.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado o no está cerrado." });
    }

    const ticket = ticketResults[0];
    const fecha_creacion = moment(ticket.fecha_creacion).format('DD-MM-YYYY');

    const queryHistorial = `
      SELECT h.*, u.nombre AS usuario_nombre, 
             ea.nombre AS estado_anterior_nombre, 
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      LEFT JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id = ? ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticket_id], async (err2, historial) => {
      if (err2) {
        return res.status(500).json({ message: "Error al obtener historial" });
      }

      const historialFormateado = historial.map(h => ({
        ...h,
        fecha_formateada: moment(h.fecha).format('DD-MM-YYYY HH:mm')
      }));

      const html = await ejs.renderFile(path.join(__dirname, '../views/informe_ticket.ejs'), {
        ticket,
        historial: historialFormateado,
        fecha_creacion
      });

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const fileName = `informe_ticket_${ticket_id}.pdf`;
      const filePath = path.join("uploads", fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" }
      });

      await browser.close();

      res.download(filePath, fileName, (err4) => {
        if (err4) {
          console.error("Error al descargar PDF:", err4);
          return res.status(500).json({ message: "Error al enviar el archivo PDF" });
        }
      });
    });
  });
};

exports.aprobarSolucion = (req, res) => {
    const { id } = req.params;
    const { aprobacion_solucion, solucion_observacion } = req.body;

    if (!['si', 'no'].includes(aprobacion_solucion)) {
        return res.status(400).json({ error: "El campo aprobacion_solucion debe ser 'si' o 'no'" });
    }

    const sql = `
        UPDATE tickets 
        SET aprobacion_solucion = ?, solucion_observacion = ? 
        WHERE id = ?
    `;

    db.query(sql, [aprobacion_solucion, solucion_observacion, id], (err, result) => {
        if (err) {
            console.error("Error al actualizar el ticket:", err);
            return res.status(500).json({ error: "Error al actualizar el ticket" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket no encontrado" });
        }

        res.json({ message: "Aprobación registrada correctamente" });
    });
};

/*
exports.obtenerPorId = (req, res) => {
  const ticketId = req.params.id;

  const queryTicket = `
    SELECT t.id, t.id_estado, t.observaciones, t.archivo_pdf, t.fecha_creacion,
           t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion, t.aprobacion_solucion, t.solucion_observacion,
           a.nombre AS area,
           ta.nombre AS tipo_atencion,
           s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante,
           e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    WHERE t.id = ?
  `;

  db.query(queryTicket, [ticketId], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al obtener el ticket", error: err });
    if (tickets.length === 0) return res.status(404).json({ message: "Ticket no encontrado" });

    const ticket = tickets[0];

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id = ?
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketId], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historial = historiales.map(h => ({
        estado_anterior: h.estado_anterior_nombre || 'N/A',
        nuevo_estado: h.estado_nuevo_nombre || 'N/A',
        observacion: h.observacion,
        fecha: h.fecha,
        usuario_cambio: h.usuario_cambio
      }));

      res.json({
        ...ticket,
        historial
      });
    });
  });
};
*/

exports.obtenerPorId = (req, res) => {
  const ticketId = req.params.id;

  const queryTicket = `
    SELECT t.id, t.id_estado, t.observaciones, t.archivo_pdf, t.fecha_creacion,
           t.id_actividad, t.detalle_solucion, t.tipo_atencion AS modo_atencion,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion, t.aprobacion_solucion, t.solucion_observacion,
           a.nombre AS area,
           ta.nombre AS tipo_atencion,
           s.nombre AS solicitante, s.email AS correo_solicitante, s.id AS id_solicitante,
           e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor,
           j.nombre AS jefatura, j.email AS correo_jefatura, j.id AS id_jefatura
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users s ON t.solicitante_id = s.id
    LEFT JOIN users e ON t.ejecutor_id = e.id
    LEFT JOIN users j ON t.id_jefatura = j.id
    WHERE t.id = ?
  `;

  db.query(queryTicket, [ticketId], (err, tickets) => {
    if (err) return res.status(500).json({ message: "Error al obtener el ticket", error: err });
    if (tickets.length === 0) return res.status(404).json({ message: "Ticket no encontrado" });

    const ticket = tickets[0];

    const queryHistorial = `
      SELECT h.ticket_id, h.id_estado_anterior, h.id_nuevo_estado, h.observacion, h.fecha,
             u.nombre AS usuario_cambio,
             ea.nombre AS estado_anterior_nombre,
             en.nombre AS estado_nuevo_nombre
      FROM historial_estado h
      JOIN users u ON h.usuario_id = u.id
      LEFT JOIN estados_ticket ea ON h.id_estado_anterior = ea.id
      LEFT JOIN estados_ticket en ON h.id_nuevo_estado = en.id
      WHERE h.ticket_id = ?
      ORDER BY h.fecha ASC
    `;

    db.query(queryHistorial, [ticketId], (err2, historiales) => {
      if (err2) return res.status(500).json({ message: "Error al obtener historial", error: err2 });

      const historial = historiales.map(h => ({
        estado_anterior: h.estado_anterior_nombre || 'N/A',
        nuevo_estado: h.estado_nuevo_nombre || 'N/A',
        observacion: h.observacion,
        fecha: h.fecha,
        usuario_cambio: h.usuario_cambio
      }));

      res.json({
        ...ticket,
        historial
      });
    });
  });
};


