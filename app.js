const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const ticketRoutes = require("./routes/ticket.routes");
const userRoutes = require("./routes/user.routes"); // ✅ AGREGADO
const areaRoutes =require("./routes/area.routes");
const tipoAtencionRoutes= require("./routes/tipo_atencion.routes");
const emailRoutes = require("./routes/email.routes"); // ✅

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes); // ✅ AGREGADO
app.use("/api/areas", areaRoutes);
app.use("/api/tipos", tipoAtencionRoutes);
app.use("/api/email", emailRoutes); // ✅

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));
