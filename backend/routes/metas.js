const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// MODULO DE METAS FINANCIERAS

// Validar cantidades de dinero
function montoValido(valor, permitirCero = false) {
  return (
    typeof valor === "number" &&
    Number.isFinite(valor) &&
    (permitirCero ? valor >= 0 : valor > 0) &&
    Math.round(valor * 100) === valor * 100
  );
}

// CREAR UNA META FINANCIERA
router.post("/", verificarToken, async (req, res) => {
  try {
    const {
      nombre_meta,
      descripcion,
      monto_objetivo,
      fecha_objetivo
    } = req.body;

    if (
      typeof nombre_meta !== "string" ||
      !nombre_meta.trim() ||
      !montoValido(monto_objetivo) ||
      typeof fecha_objetivo !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha_objetivo) ||
      (descripcion != null && typeof descripcion !== "string")
    ) {
      return res.status(400).json({
        mensaje: "Verifica los datos de la meta"
      });
    }

    const fecha = new Date(fecha_objetivo + "T00:00:00Z");

    if (
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== fecha_objetivo
    ) {
      return res.status(400).json({
        mensaje: "La fecha objetivo no es válida"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO metas_financieras
       (id_usuario, nombre_meta, descripcion,
        monto_objetivo, monto_ahorrado,
        fecha_objetivo, estado)
       VALUES ($1, $2, $3, $4, 0, $5, 'En progreso')
       RETURNING *`,
      [
        req.usuario.id_usuario,
        nombre_meta.trim(),
        descripcion?.trim() || null,
        monto_objetivo,
        fecha_objetivo
      ]
    );

    return res.status(201).json({
      mensaje: "Meta financiera creada correctamente",
      meta: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al crear meta:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo crear la meta"
    });
  }
});

// CONSULTAR LAS METAS DEL USUARIO
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT *,
        ROUND(
          (monto_ahorrado / monto_objetivo) * 100, 2
        ) AS porcentaje_progreso
       FROM metas_financieras
       WHERE id_usuario = $1
       ORDER BY id_meta DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Metas financieras de FINAZZ",
      metas: resultado.rows
    });

  } catch (error) {
    console.error("Error al consultar metas:", error.message);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las metas"
    });
  }
});

// AGREGAR AHORRO A UNA META
router.patch("/:id/ahorrar", verificarToken, async (req, res) => {
  try {
    const idMeta = Number(req.params.id);
    const { monto } = req.body;

    if (
      !Number.isSafeInteger(idMeta) ||
      idMeta <= 0 ||
      !montoValido(monto)
    ) {
      return res.status(400).json({
        mensaje: "ID o monto inválido"
      });
    }

    const resultado = await pool.query(
      `UPDATE metas_financieras
       SET monto_ahorrado = monto_ahorrado + $1,
           estado = CASE
             WHEN monto_ahorrado + $1 >= monto_objetivo
             THEN 'Completada'
             ELSE 'En progreso'
           END
       WHERE id_meta = $2
         AND id_usuario = $3
         AND estado = 'En progreso'
       RETURNING *`,
      [monto, idMeta, req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Meta no encontrada o no está en progreso"
      });
    }

    return res.json({
      mensaje: "Ahorro agregado correctamente",
      meta: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al agregar ahorro:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo agregar el ahorro"
    });
  }
});

// CANCELAR UNA META
router.patch("/:id/cancelar", verificarToken, async (req, res) => {
  try {
    const idMeta = Number(req.params.id);

    if (!Number.isSafeInteger(idMeta) || idMeta <= 0) {
      return res.status(400).json({
        mensaje: "ID de meta inválido"
      });
    }

    const resultado = await pool.query(
      `UPDATE metas_financieras
       SET estado = 'Cancelada'
       WHERE id_meta = $1
         AND id_usuario = $2
         AND estado = 'En progreso'
       RETURNING *`,
      [idMeta, req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Meta no encontrada o no se puede cancelar"
      });
    }

    return res.json({
      mensaje: "Meta cancelada correctamente",
      meta: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al cancelar meta:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo cancelar la meta"
    });
  }
});

module.exports = router;