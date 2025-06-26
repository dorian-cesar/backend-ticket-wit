const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const auth = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

router.post("/crear",  upload.single("archivo_pdf"), ticketController.crearTicket);

router.post('/:ticket_id/cerrar', upload.single('archivo_solucion'), ticketController.cerrarTicket);

router.put("/editar/:id", upload.single("archivo_pdf"), ticketController.editarTicket);

router.put("/estado/:ticket_id", auth.verify, ticketController.cambiarEstado);

router.get("/", auth.verify, ticketController.listarTodos); // Listar todos
router.get("/:usuario_id", auth.verify, ticketController.listarPorUsuario); // Listar por usuario

router.get("/ejecutor/:ejecutor_id", ticketController.listarPorEjecutor);

router.get('/pendientes/jefatura/:id_jefatura', auth.verify,ticketController.ticketsPorJefaturaPendientes);


router.put("/autorizar-rechazar/:ticket_id",auth.verify, ticketController.autorizarORechazarTicket);

router.get("/descargar/:ticket_id", (req, res) => {
  const db = require("../models/db");
  const ticketId = req.params.ticket_id;

  const query = "SELECT archivo_pdf FROM tickets WHERE id = ?";

  db.query(query, [ticketId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado o sin archivo." });
    }

    const archivo = results[0].archivo_pdf;

    if (!archivo) {
      return res.status(400).json({ message: "Este ticket no tiene archivo asociado." });
    }

    const filePath = path.join(__dirname, "../uploads", archivo);
    res.download(filePath, archivo, (err) => {
      if (err) {
        console.error("Error al descargar el archivo:", err);
        res.status(500).json({ message: "Error al descargar el archivo." });
      }
    });
  });
});

module.exports = router;