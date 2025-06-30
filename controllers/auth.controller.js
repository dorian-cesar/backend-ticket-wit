const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../models/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");


exports.login = async (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: "User no encontrado" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Credenciales inválidas" });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = results[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiration = new Date(Date.now() + 3600000*5); // 1 hora

    db.query(
      "UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE id = ?",
      [token, expiration, user.id],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Error al guardar token" });

        // Configura tu transporte real
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            //user: process.env.MAIL_USER,
            //pass: process.env.MAIL_PASS

             user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log( process.env.EMAIL_USER);

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
        const mailOptions = {
          from: process.env.MAIL_USER,
          to: email,
          subject: "Recuperación de contraseña",
          text: `Hola ${user.nombre}, para restablecer tu contraseña ingresa al siguiente enlace: ${resetLink}`
        };

        transporter.sendMail(mailOptions, (err3) => {
          if (err3) return res.status(500).json({ message: "Error al enviar correo" });

          res.json({ message: "Correo de recuperación enviado" });
        });
      }
    );
  });
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  db.query(
    "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > NOW()",
    [token],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      const user = results[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE id = ?",
        [hashedPassword, user.id],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Error al actualizar contraseña" });

          res.json({ message: "Contraseña actualizada correctamente" });
        }
      );
    }
  );
};