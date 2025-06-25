const express = require("express");
const router = express.Router();
const estadoController = require("../controllers/estado.controller");
const auth = require("../middleware/auth.middleware")

router.get("/", auth.verify, estadoController.listarEstados);
router.get("/:id", auth.verify, estadoController.obtenerEstado);
router.post("/", auth.verify, estadoController.crearEstado);
router.put("/:id", auth.verify, estadoController.actualizarEstado);
router.delete("/:id", auth.verify, estadoController.eliminarEstado);

module.exports = router;
