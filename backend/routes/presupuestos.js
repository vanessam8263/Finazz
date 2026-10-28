const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// MODULO DE PRESUPUESTOS

// CREAR UN PRESUPUESTO
router.post("/", verificarToken, async (req, res) => {
  try {
    const { categoria, monto_limite, mes, anio } = req.body;

    if (
      typeof categoria !== "string" ||
      !categoria.trim() ||
      typeof monto_limite !== "number" ||
      !Number.isFinite(monto_limite) ||
      monto_limite <= 0 ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100
    ) {
      return res.status(400).json({
        mensaje: "Verifica los datos del presupuesto"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO presupuestos
       (id_usuario, categoria, monto_limite, mes, anio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.usuario.id_usuario,
        categoria.trim(),
        monto_limite,
        mes,
        anio
      ]
    );

    return res.status(201).json({
      mensaje: "Presupuesto creado correctamente en FINAZZ",
      presupuesto: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe un presupuesto para esta categoría y mes"
      });
    }

    console.error("Error al crear presupuesto:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo crear el presupuesto"
    });
  }
});

// CONSULTAR PRESUPUESTOS Y GASTOS
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.id_presupuesto,
         p.categoria,
         p.monto_limite,
         p.mes,
         p.anio,
         COALESCE(g.total_gastado, 0) AS total_gastado,
         p.monto_limite - COALESCE(g.total_gastado, 0)
           AS disponible,
         ROUND(
           COALESCE(g.total_gastado, 0)
           / p.monto_limite * 100, 2
         ) AS porcentaje_utilizado
       FROM presupuestos p
       LEFT JOIN LATERAL (
         SELECT SUM(g.monto) AS total_gastado
         FROM gastos g
         WHERE g.id_usuario = p.id_usuario
           AND LOWER(g.categoria) = LOWER(p.categoria)
           AND EXTRACT(MONTH FROM g.fecha_registro) = p.mes
           AND EXTRACT(YEAR FROM g.fecha_registro) = p.anio
       ) g ON TRUE
       WHERE p.id_usuario = $1
       ORDER BY p.anio DESC, p.mes DESC, p.categoria`,
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Presupuestos de FINAZZ",
      presupuestos: resultado.rows
    });

  } catch (error) {
    console.error(
      "Error al consultar presupuestos:",
      error.message
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar los presupuestos"
    });
  }
});


// ACTUALIZAR UN PRESUPUESTO
router.patch("/:id", verificarToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { monto_limite } = req.body;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      typeof monto_limite !== "number" ||
      !Number.isFinite(monto_limite) ||
      monto_limite <= 0
    ) {
      return res.status(400).json({
        mensaje: "El ID y el nuevo límite deben ser válidos"
      });
    }

    const resultado = await pool.query(
      `UPDATE presupuestos
       SET monto_limite = $1
       WHERE id_presupuesto = $2
         AND id_usuario = $3
       RETURNING *`,
      [monto_limite, id, req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Presupuesto no encontrado"
      });
    }

    return res.json({
      mensaje: "Presupuesto actualizado correctamente",
      presupuesto: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al actualizar presupuesto:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo actualizar el presupuesto"
    });
  }
});

// ELIMINAR UN PRESUPUESTO
router.delete("/:id", verificarToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "El ID del presupuesto no es válido"
      });
    }

    const resultado = await pool.query(
      `DELETE FROM presupuestos
       WHERE id_presupuesto = $1
         AND id_usuario = $2
       RETURNING *`,
      [id, req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Presupuesto no encontrado"
      });
    }

    return res.json({
      mensaje: "Presupuesto eliminado correctamente",
      presupuesto: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al eliminar presupuesto:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo eliminar el presupuesto"
    });
  }
});


module.exports = router;