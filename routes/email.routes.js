const express = require("express");
const router = express.Router();
const emailController = require("../controllers/email.controller");

router.post("/send", emailController.sendEmail);

module.exports = router;



//# id, solicitante_id, area_id, tipo_atencion_id, ejecutor_id, id_jefatura, observaciones, archivo_pdf, estado, id_estado, fecha_creacion, archivo_url, id_actividad, detalle_solucion, tipo_atencion, necesita_despacho, detalles_despacho, archivo_solucion
