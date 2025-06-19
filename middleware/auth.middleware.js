const jwt = require("jsonwebtoken");

exports.verify = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "Token requerido" });
  }

  // Se asume que el token viene en el formato "Bearer <token>"
  // Por eso se hace el split y se toma la segunda parte.
  const tokenPart = token.split(" ")[1];

  jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Si hay un error, puede ser que el token haya expirado, sea inválido, etc.
      console.error("Error al verificar el token:", err.message); // Agregamos un log de error
      return res.status(401).json({ message: "Token inválido" });
    }

    // ¡Aquí es donde accedes a la información decodificada!
    console.log("-----------------------------------------");
    console.log("Token decodificado (payload):", decoded);
    console.log("ID del usuario:", decoded.id);
    console.log("Rol del usuario:", decoded.rol);
    console.log("Fecha de expiración (iat):", new Date(decoded.iat * 1000)); // iat es "issued at" (fecha de emisión)
    console.log("Fecha de expiración (exp):", new Date(decoded.exp * 1000)); // exp es "expiration time"
    console.log("-----------------------------------------");

    req.user = decoded; // Esto es importante para pasar la información del usuario a las rutas siguientes
    next(); // Continúa con la siguiente función middleware o controlador de ruta
  });
};