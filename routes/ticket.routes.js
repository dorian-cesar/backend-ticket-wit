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

module.exports = router;