const jwt = require("jsonwebtoken");

exports.verify = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token requerido" });

  const tokenPart = token.split(" ")[1];
  jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token inválido" });
    req.user = decoded;
    next();
  });
};