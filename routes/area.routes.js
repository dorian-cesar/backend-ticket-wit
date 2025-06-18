const express = require("express");
const router = express.Router();
const controller = require("../controllers/area.controller");
const auth = require("../middleware/auth.middleware");

router.get("/", auth.verify, controller.listarAreas);
router.post("/", auth.verify, controller.crearArea);
router.put("/:id", auth.verify, controller.editarArea);
router.delete("/:id", auth.verify, controller.borrarArea);

module.exports = router;
