const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// MODULO DE DEUDAS

// REGISTRAR UNA DEUDA
router.post("/", verificarToken, async (req, res) => {
  try {
    const {
      nombre_deuda,
      descripcion,
      monto_original,
      tasa_interes = 0,
      fecha_vencimiento
    } = req.body;

    if (
      typeof nombre_deuda !== "string" ||
      !nombre_deuda.trim() ||
      nombre_deuda.trim().length > 100 ||
      typeof monto_original !== "number" ||
      !Number.isFinite(monto_original) ||
      monto_original <= 0 ||
      typeof tasa_interes !== "number" ||
      !Number.isFinite(tasa_interes) ||
      tasa_interes < 0 ||
      tasa_interes > 100 ||
      (descripcion != null && typeof descripcion !== "string") ||
      (fecha_vencimiento != null &&
        (typeof fecha_vencimiento !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(fecha_vencimiento)))
    ) {
      return res.status(400).json({
        mensaje: "Verifica los datos de la deuda"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO deudas (
        id_usuario,
        nombre_deuda,
        descripcion,
        monto_original,
        saldo_pendiente,
        tasa_interes,
        fecha_vencimiento
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6)
      RETURNING *`,
      [
        req.usuario.id_usuario,
        nombre_deuda.trim(),
        descripcion || null,
        monto_original,
        tasa_interes,
        fecha_vencimiento || null
      ]
    );

    return res.status(201).json({
      mensaje: "Deuda registrada correctamente en FINAZZ",
      deuda: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === "23514" || error.code === "22007") {
      return res.status(400).json({
        mensaje: "Revisa la fecha o los valores de la deuda"
      });
    }

    console.error("Error al registrar deuda:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar la deuda"
    });
  }
});

// CONSULTAR LAS DEUDAS DEL USUARIO
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
        id_deuda,
        nombre_deuda,
        descripcion,
        monto_original,
        saldo_pendiente,
        tasa_interes,
        fecha_inicio,
        fecha_vencimiento,
        estado,
        ROUND(
          (monto_original - saldo_pendiente)
          / monto_original * 100, 2
        ) AS porcentaje_pagado
      FROM deudas
      WHERE id_usuario = $1
      ORDER BY fecha_registro DESC, id_deuda DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Deudas registradas en FINAZZ",
      deudas: resultado.rows
    });

  } catch (error) {
    console.error("Error al consultar deudas:", error.message);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las deudas"
    });
  }
});

// REGISTRAR UN ABONO A UNA DEUDA
router.post("/:id/pagos", verificarToken, async (req, res) => {
  const idDeuda = Number(req.params.id);
  const { monto_pago, observaciones } = req.body;

  if (
    !Number.isInteger(idDeuda) ||
    idDeuda <= 0 ||
    typeof monto_pago !== "number" ||
    !Number.isFinite(monto_pago) ||
    monto_pago <= 0 ||
    Math.round(monto_pago * 100) !== monto_pago * 100 ||
    (observaciones != null && typeof observaciones !== "string")
  ) {
    return res.status(400).json({
      mensaje: "Verifica el ID y el monto del pago"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Buscar la deuda y bloquearla durante la operación
    const consulta = await client.query(
      `SELECT id_deuda, saldo_pendiente, estado
       FROM deudas
       WHERE id_deuda = $1 AND id_usuario = $2
       FOR UPDATE`,
      [idDeuda, req.usuario.id_usuario]
    );

    if (consulta.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Deuda no encontrada"
      });
    }

    const deuda = consulta.rows[0];
    const saldoActual = Math.round(
      Number(deuda.saldo_pendiente) * 100
    );
    const pagoCentavos = Math.round(monto_pago * 100);

    if (pagoCentavos > saldoActual) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "El pago no puede superar el saldo pendiente"
      });
    }

    const nuevoSaldo = (saldoActual - pagoCentavos) / 100;
    const nuevoEstado = nuevoSaldo === 0
      ? "Pagada"
      : "Pendiente";

    // Registrar el pago
    const pago = await client.query(
      `INSERT INTO pagos_deudas
       (id_deuda, monto_pago, observaciones)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        idDeuda,
        monto_pago,
        observaciones || null
      ]
    );

    // Actualizar el saldo de la deuda
    const actualizacion = await client.query(
      `UPDATE deudas
       SET saldo_pendiente = $1,
           estado = $2
       WHERE id_deuda = $3
         AND id_usuario = $4
       RETURNING *`,
      [
        nuevoSaldo,
        nuevoEstado,
        idDeuda,
        req.usuario.id_usuario
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      mensaje: "Pago registrado correctamente en FINAZZ",
      pago: pago.rows[0],
      deuda: actualizacion.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al registrar pago:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar el pago"
    });

  } finally {
    client.release();
  }
});

// CONSULTAR HISTORIAL DE PAGOS DE UNA DEUDA
router.get("/:id/pagos", verificarToken, async (req, res) => {
  try {
    const idDeuda = Number(req.params.id);

    if (!Number.isInteger(idDeuda) || idDeuda <= 0) {
      return res.status(400).json({
        mensaje: "El ID de la deuda no es válido"
      });
    }

    // Verificar que la deuda pertenezca al usuario
    const deuda = await pool.query(
      `SELECT id_deuda, nombre_deuda, saldo_pendiente
       FROM deudas
       WHERE id_deuda = $1 AND id_usuario = $2`,
      [idDeuda, req.usuario.id_usuario]
    );

    if (deuda.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Deuda no encontrada"
      });
    }

    // Consultar todos los pagos
    const pagos = await pool.query(
      `SELECT id_pago, monto_pago, fecha_pago, observaciones
       FROM pagos_deudas
       WHERE id_deuda = $1
       ORDER BY fecha_pago DESC, id_pago DESC`,
      [idDeuda]
    );

    return res.json({
      mensaje: "Historial de pagos de FINAZZ",
      deuda: deuda.rows[0],
      pagos: pagos.rows
    });

  } catch (error) {
    console.error("Error al consultar pagos:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo consultar el historial de pagos"
    });
  }
});

// ACTUALIZAR LOS DATOS DE UNA DEUDA
router.patch("/:id", verificarToken, async (req, res) => {
  try {
    const idDeuda = Number(req.params.id);

    if (!Number.isInteger(idDeuda) || idDeuda <= 0) {
      return res.status(400).json({
        mensaje: "El ID de la deuda no es válido"
      });
    }

    const camposPermitidos = [
      "nombre_deuda",
      "descripcion",
      "tasa_interes",
      "fecha_vencimiento"
    ];

    const camposRecibidos = Object.keys(req.body || {});

    if (
      camposRecibidos.length === 0 ||
      camposRecibidos.some(
        campo => !camposPermitidos.includes(campo)
      )
    ) {
      return res.status(400).json({
        mensaje: "Solo puedes modificar los datos permitidos"
      });
    }

    const {
      nombre_deuda,
      descripcion,
      tasa_interes,
      fecha_vencimiento
    } = req.body;

    if (
      (nombre_deuda !== undefined &&
        (typeof nombre_deuda !== "string" ||
         !nombre_deuda.trim() ||
         nombre_deuda.trim().length > 100)) ||

      (descripcion !== undefined &&
        descripcion !== null &&
        typeof descripcion !== "string") ||

      (tasa_interes !== undefined &&
        (typeof tasa_interes !== "number" ||
         !Number.isFinite(tasa_interes) ||
         tasa_interes < 0 ||
         tasa_interes > 100)) ||

      (fecha_vencimiento !== undefined &&
        fecha_vencimiento !== null &&
        (typeof fecha_vencimiento !== "string" ||
         !/^\d{4}-\d{2}-\d{2}$/.test(fecha_vencimiento)))
    ) {
      return res.status(400).json({
        mensaje: "Verifica los datos de la deuda"
      });
    }

    const resultado = await pool.query(
      `UPDATE deudas
       SET nombre_deuda = COALESCE($1, nombre_deuda),
           descripcion = CASE
             WHEN $2 THEN $3
             ELSE descripcion
           END,
           tasa_interes = COALESCE($4, tasa_interes),
           fecha_vencimiento = CASE
             WHEN $5 THEN $6::date
             ELSE fecha_vencimiento
           END
       WHERE id_deuda = $7
         AND id_usuario = $8
       RETURNING *`,
      [
        nombre_deuda?.trim() ?? null,
        descripcion !== undefined,
        descripcion ?? null,
        tasa_interes ?? null,
        fecha_vencimiento !== undefined,
        fecha_vencimiento ?? null,
        idDeuda,
        req.usuario.id_usuario
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Deuda no encontrada"
      });
    }

    return res.json({
      mensaje: "Deuda actualizada correctamente",
      deuda: resultado.rows[0]
    });

  } catch (error) {
    if (["23514", "22007", "22008"].includes(error.code)) {
      return res.status(400).json({
        mensaje: "La fecha o los valores no son válidos"
      });
    }

    console.error("Error al actualizar deuda:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo actualizar la deuda"
    });
  }
});

// ELIMINAR UNA DEUDA SIN PAGOS REGISTRADOS
router.delete("/:id", verificarToken, async (req, res) => {
  const idDeuda = Number(req.params.id);

  if (!Number.isInteger(idDeuda) || idDeuda <= 0) {
    return res.status(400).json({
      mensaje: "El ID de la deuda no es válido"
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const deuda = await client.query(
      `SELECT id_deuda
       FROM deudas
       WHERE id_deuda = $1 AND id_usuario = $2
       FOR UPDATE`,
      [idDeuda, req.usuario.id_usuario]
    );

    if (deuda.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Deuda no encontrada"
      });
    }

    const pagos = await client.query(
      `SELECT COUNT(*) AS total
       FROM pagos_deudas
       WHERE id_deuda = $1`,
      [idDeuda]
    );

    if (Number(pagos.rows[0].total) > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        mensaje: "No puedes eliminar una deuda con pagos registrados"
      });
    }

    const resultado = await client.query(
      `DELETE FROM deudas
       WHERE id_deuda = $1 AND id_usuario = $2
       RETURNING *`,
      [idDeuda, req.usuario.id_usuario]
    );

    await client.query("COMMIT");

    return res.json({
      mensaje: "Deuda eliminada correctamente",
      deuda: resultado.rows[0]
    });

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Error al eliminar deuda:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la deuda"
    });

  } finally {
    if (client) client.release();
  }
});

module.exports = router;