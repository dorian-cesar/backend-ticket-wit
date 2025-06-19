const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const auth = require("../middleware/auth.middleware");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

router.post("/crear", auth.verify, upload.single("archivo_pdf"), ticketController.crearTicket);
router.put("/estado/:ticket_id", auth.verify, ticketController.cambiarEstado);

router.get("/", auth.verify, ticketController.listarTodos); // Listar todos
router.get("/:usuario_id", auth.verify, ticketController.listarPorUsuario); // Listar por usuario

module.exports = router;