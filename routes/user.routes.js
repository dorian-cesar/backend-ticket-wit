const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");
const auth = require("../middleware/auth.middleware");

router.get("/", auth.verify, controller.listarUsuarios);
router.post("/", auth.verify,controller.crearUsuario);
router.put("/:id", auth.verify, controller.editarUsuario);
router.delete("/:id", auth.verify, controller.borrarUsuario);

module.exports = router;
