const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// Balance financiero del usuario autenticado
router.get("/", verificarToken, async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `SELECT
        (SELECT COALESCE(SUM(monto), 0)
         FROM ingresos
         WHERE id_usuario = $1) AS total_ingresos,

        (SELECT COALESCE(SUM(monto), 0)
         FROM gastos
         WHERE id_usuario = $1) AS total_gastos`,
      [idUsuario]
    );

    const totalIngresos = Number(resultado.rows[0].total_ingresos);
    const totalGastos = Number(resultado.rows[0].total_gastos);

    const balance = totalIngresos - totalGastos;

    return res.json({
      mensaje: "Balance financiero de FINAZZ",
      usuario: idUsuario,
      total_ingresos: totalIngresos,
      total_gastos: totalGastos,
      balance: Number(balance.toFixed(2))
    });

  } catch (error) {
    console.error("Error al calcular balance:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo calcular el balance financiero"
    });
  }
});

module.exports = router;