const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');

router.post('/', actividadController.crearActividad);
router.get('/', actividadController.listarActividades);
router.get('/:id', actividadController.obtenerActividad);
router.put('/:id', actividadController.actualizarActividad);
router.delete('/:id', actividadController.eliminarActividad);

module.exports = router;
