const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Acceso denegado. Inicia sesión.",
    });
  }

  const token = encabezado.split(" ")[1];

  try {
    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: "Sesión inválida o expirada.",
    });
  }
}

module.exports = verificarToken;