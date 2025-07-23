const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth.middleware")
const actividadController = require('../controllers/actividad.controller');

router.post('/',auth.verify, actividadController.crearActividad);
router.get('/',auth.verify, actividadController.listarActividades);
router.get('/:id',auth.verify, actividadController.obtenerActividad);
router.put('/:id', actividadController.actualizarActividad);
router.delete('/:id',auth.verify, actividadController.eliminarActividad);
router.get('/tipo/:tipo_atencion_id', actividadController.obtenerPorTipoAtencion);

module.exports = router;
