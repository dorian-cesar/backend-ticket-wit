const express = require('express');
const router = express.Router();
const direccionController = require('../controllers/direccionController');
const auth = require("../middleware/auth.middleware");

router.post('/',auth.verify, direccionController.crearDireccion);
router.get('/',auth.verify, direccionController.listarDirecciones);
router.get('/:id',auth.verify, direccionController.obtenerDireccion);
router.put('/:id',auth.verify, direccionController.actualizarDireccion);
router.delete('/:id',auth.verify, direccionController.eliminarDireccion);

module.exports = router;
