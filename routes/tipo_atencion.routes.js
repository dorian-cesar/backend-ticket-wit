const express = require("express");
const router = express.Router();
const controller = require("../controllers/tipo_atencion.controller");
const auth = require("../middleware/auth.middleware");

router.get("/", auth.verify, controller.listarTipos);
router.post("/", auth.verify, controller.crearTipo);
router.put("/:id", auth.verify, controller.editarTipo);
router.delete("/:id", auth.verify, controller.borrarTipo);

module.exports = router;
