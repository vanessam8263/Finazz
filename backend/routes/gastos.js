
const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// MODULO DE GASTOS

// REGISTRAR GASTO
router.post("/", verificarToken, async (req, res) => {
  try {
    const {
      categoria,
      descripcion,
      monto,
      tipo,
      frecuencia
    } = req.body;

    const tiposPermitidos = ["Fijo", "Variable"];

    const frecuenciasPermitidas = [
      "Diario",
      "Semanal",
      "Quincenal",
      "Mensual",
      "Anual"
    ];

    if (
      typeof categoria !== "string" ||
      !categoria.trim() ||
      categoria.trim().length > 50
    ) {
      return res.status(400).json({
        mensaje: "Ingresa una categoría válida"
      });
    }

    if (
      descripcion != null &&
      typeof descripcion !== "string"
    ) {
      return res.status(400).json({
        mensaje: "La descripción no es válida"
      });
    }

    if (
      typeof monto !== "number" ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      monto > 9999999999.99 ||
      Math.abs(monto * 100 - Math.round(monto * 100)) > 0.000001
    ) {
      return res.status(400).json({
        mensaje: "El monto debe ser positivo y tener máximo dos decimales"
      });
    }

    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        mensaje: "El tipo debe ser Fijo o Variable"
      });
    }

    if (!frecuenciasPermitidas.includes(frecuencia)) {
      return res.status(400).json({
        mensaje: "Selecciona una frecuencia válida"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO gastos
       (id_usuario, categoria, descripcion, monto, tipo, frecuencia)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.usuario.id_usuario,
        categoria.trim(),
        descripcion?.trim() || null,
        monto,
        tipo,
        frecuencia
      ]
    );

    return res.status(201).json({
      mensaje: "Gasto registrado correctamente en FINAZZ",
      gasto: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al registrar gasto:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar el gasto"
    });
  }
});

// CONSULTAR GASTOS
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT *
       FROM gastos
       WHERE id_usuario = $1
       ORDER BY fecha_registro DESC, id_gasto DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Gastos de FINAZZ",
      gastos: resultado.rows
    });

  } catch (error) {
    console.error("Error al consultar gastos:", error.message);

    return res.status(500).json({
      mensaje: "No se pudieron consultar los gastos"
    });
  }
});

module.exports = router;
