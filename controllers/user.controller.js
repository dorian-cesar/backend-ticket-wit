const db = require("../models/db");
const bcrypt = require("bcrypt");

exports.listarUsuarios = (req, res) => {
  db.query("SELECT id, nombre, email, rol , id_jefatura FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: "Error al listar usuarios" });
    res.json(results);
  });
};

exports.crearUsuario = (req, res) => {
  const { nombre, email, password, rol, id_jefatura } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: "Error al encriptar contraseña" });
    }

    db.query(
      "INSERT INTO users (nombre, email, password, rol, id_jefatura) VALUES (?, ?, ?, ?, ?)",
      [nombre, email, hash, rol, id_jefatura],
      (err2) => {
        if (err2) {
          if (err2.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "El correo electrónico ya está registrado" });
          } else {
            console.error("Error al crear usuario:", err2);
            return res.status(500).json({ error: "Error al crear usuario" });
          }
        }

        res.json({ message: "Usuario creado exitosamente" });
      }
    );
  });
};


/*
exports.editarUsuario = (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol } = req.body;
  db.query("UPDATE users SET nombre = ?, email = ?, rol = ? WHERE id = ?",
    [nombre, email, rol, id], (err) => {
      if (err) return res.status(500).json({ error: "Error al editar usuario" });
      res.json({ message: "Usuario actualizado" });
    });
}; */

exports.borrarUsuario = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar usuario" });
    res.json({ message: "Usuario eliminado" });
  });
};

//const bcrypt = require("bcrypt");

exports.editarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol, password, id_jefatura } = req.body;

  try {
    // Si viene nueva contraseña, la encriptamos y la actualizamos también
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        "UPDATE users SET nombre = ?, email = ?, rol = ?, password = ? , id_jefatura =?  WHERE id = ?",
        [nombre, email, rol, hashedPassword, id_jefatura ,id],
        (err) => {
          if (err) return res.status(500).json({ error: "Error al editar usuario con contraseña" });
          res.json({ message: "Usuario actualizado (incluye nueva contraseña)" });
        }
      );
    } else {
      // Si no se incluye la contraseña, solo se actualizan los otros campos
      db.query(
        "UPDATE users SET nombre = ?, email = ?, rol = ? , id_jefatura = ? WHERE id = ?",
        [nombre, email, rol, id_jefatura, id],
        (err) => {
          if (err) return res.status(500).json({ error: "Error al editar usuario" });
          res.json({ message: "Usuario actualizado" });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ error: "Error interno al procesar la solicitud" });
  }
};

