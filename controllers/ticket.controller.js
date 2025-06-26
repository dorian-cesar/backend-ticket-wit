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
           ta.nombre AS tipo_atencion,
           e.nombre AS ejecutor, e.email AS correo_ejecutor, e.id AS id_ejecutor,
           t.id_actividad, t.detalle_solucion, t.tipo_atencion AS tipo_atencion_cierre,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion
    FROM tickets t
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
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
          estado_anterior: h.estado_anterior_nombre || 'N/A',
          nuevo_estado: h.estado_nuevo_nombre || 'N/A',
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
           t.id_actividad, t.detalle_solucion, t.tipo_atencion,
           t.necesita_despacho, t.detalles_despacho, t.archivo_solucion,
           a.nombre AS area,
           ta.nombre AS tipo_atencion_nombre,
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
          estado_anterior: h.estado_anterior_nombre || 'N/A',
          nuevo_estado: h.estado_nuevo_nombre || 'N/A',
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
  const { id_jefatura } = req.params;

  const query = `
    SELECT t.id, t.solicitante_id, u.nombre AS nombre_solicitante,
           t.area_id, a.nombre AS area,
           t.tipo_atencion_id, ta.nombre AS tipo_atencion,
           t.observaciones, t.fecha_creacion, t.id_estado,
           t.ejecutor_id, e.nombre AS nombre_ejecutor,
           t.archivo_pdf
    FROM tickets t
    JOIN users u ON t.solicitante_id = u.id
    JOIN users j ON u.id_jefatura = j.id
    JOIN areas a ON t.area_id = a.id
    JOIN tipo_atencion ta ON t.tipo_atencion_id = ta.id
    JOIN users e ON t.ejecutor_id = e.id
    WHERE j.id = ? AND t.id_estado = 1
    ORDER BY t.fecha_creacion DESC
  `;

  db.query(query, [id_jefatura], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tickets pendientes', detalle: err });
    res.json(rows);
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

  const getEstadoAnterior = "SELECT id_estado FROM tickets WHERE id = ?";

  db.query(getEstadoAnterior, [ticket_id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const id_estado_anterior = result[0].id_estado;

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

            res.json({ message: "Ticket cerrado correctamente" });
          }
        );
      }
    );
  });
};

// controllers/ticket.controller.js

const moment = require('moment');

exports.generarInformePDF = (req, res) => {
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

  db.query(queryTicket, [ticket_id], (err, ticketResults) => {
    if (err || ticketResults.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado o no está cerrado." });
    }

    const ticket = ticketResults[0];

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

    db.query(queryHistorial, [ticket_id], (err2, historial) => {
      if (err2) {
        return res.status(500).json({ message: "Error al obtener historial" });
      }

      const doc = new PDFDocument({ margin: 50 });
      const fileName = `informe_ticket_${ticket_id}.pdf`;
      const filePath = path.join("uploads", fileName);

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(20).fillColor('#0055A5').text(`Informe de Ticket #${ticket_id}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).fillColor('black');
      doc.text(` Fecha de Creación: ${moment(ticket.fecha_creacion).format('DD-MM-YYYY')}`);
      doc.text(` Solicitante: ${ticket.solicitante_nombre}`);
      doc.text(` Ejecutor: ${ticket.ejecutor_nombre}`);
      doc.text(` Área: ${ticket.area_nombre}`);
      doc.text(` Tipo Atención: ${ticket.tipo_atencion_nombre}`);
      doc.text(` Actividad Realizada: ${ticket.actividad_nombre || 'N/A'}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Detalle de la Solución:', { underline: true });
      doc.font('Helvetica').text(ticket.detalle_solucion || 'N/A');
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Tipo de Atención:', { continued: true });
      doc.font('Helvetica').text(` ${ticket.tipo_atencion}`);

      doc.font('Helvetica-Bold').text('¿Requiere despacho?:', { continued: true });
      doc.font('Helvetica').text(` ${ticket.necesita_despacho}`);
      if (ticket.necesita_despacho === 'si') {
        doc.font('Helvetica-Bold').text('Detalles del despacho:', { continued: true });
        doc.font('Helvetica').text(` ${ticket.detalles_despacho || 'N/A'}`);
      }
      doc.moveDown();

      doc.fontSize(14).fillColor('#0055A5').text("Historial de Estados", { underline: true });
      doc.fillColor('black');

      historial.forEach(h => {
        doc.moveDown(0.5);
        doc.fontSize(12).text(` ${moment(h.fecha).format('DD-MM-YYYY HH:mm')}`);
        doc.text(` Usuario: ${h.usuario_nombre}`);
        doc.text(` Estado: ${h.estado_anterior_nombre} --> ${h.estado_nuevo_nombre}`);
        doc.text(` Observación: ${h.observacion}`);
      });

      doc.end();

      doc.on('finish', () => {
        res.download(filePath, fileName);
      });
    });
  });
};

