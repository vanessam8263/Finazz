
const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// REGISTRAR INGRESO
router.post("/", verificarToken, async (req, res) => {
  try {
    const { concepto, monto, frecuencia } = req.body;

    const frecuenciasPermitidas = [
      "Diario",
      "Semanal",
      "Quincenal",
      "Mensual",
      "Anual"
    ];

    // Validar concepto
    if (
      typeof concepto !== "string" ||
      !concepto.trim() ||
      concepto.trim().length > 150
    ) {
      return res.status(400).json({
        mensaje: "Ingresa un concepto válido"
      });
    }

    // Validar monto
    if (
      typeof monto !== "number" ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      monto > 9999999999.99 ||
      Math.round(monto * 100) !== monto * 100
    ) {
      return res.status(400).json({
        mensaje: "El monto debe ser un número positivo con máximo dos decimales"
      });
    }

    // Validar frecuencia
    if (!frecuenciasPermitidas.includes(frecuencia)) {
      return res.status(400).json({
        mensaje: "Selecciona una frecuencia válida"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO ingresos
       (id_usuario, concepto, monto, frecuencia)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        req.usuario.id_usuario,
        concepto.trim(),
        monto,
        frecuencia
      ]
    );

    return res.status(201).json({
      mensaje: "Ingreso registrado correctamente en FINAZZ",
      ingreso: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al registrar ingreso:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar el ingreso"
    });
  }
});

// CONSULTAR INGRESOS DEL USUARIO
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT *
       FROM ingresos
       WHERE id_usuario = $1
       ORDER BY fecha_registro DESC, id_ingreso DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Ingresos de FINAZZ",
      ingresos: resultado.rows
    });

  } catch (error) {
    console.error("Error al consultar ingresos:", error.message);

    return res.status(500).json({
      mensaje: "No se pudieron consultar los ingresos"
    });
  }
});

module.exports = router;
