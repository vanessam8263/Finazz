const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// REPORTES FINANCIEROS MENSUALES

router.get("/mensual", verificarToken, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const anio = Number(req.query.anio);

    if (
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100
    ) {
      return res.status(400).json({
        mensaje: "Debes indicar un mes y año válidos"
      });
    }

    const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;

    const fin =
      mes === 12
        ? `${anio + 1}-01-01`
        : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

    const idUsuario = req.usuario.id_usuario;

    // TOTAL DE INGRESOS DEL MES
    const ingresos = await pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM ingresos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < $3::date`,
      [idUsuario, inicio, fin]
    );

    // TOTAL DE GASTOS DEL MES
    const gastos = await pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM gastos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < $3::date`,
      [idUsuario, inicio, fin]
    );

    // GASTOS AGRUPADOS POR CATEGORIA
    const categorias = await pool.query(
      `SELECT
         categoria,
         SUM(monto) AS total
       FROM gastos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < $3::date
       GROUP BY categoria
       ORDER BY total DESC`,
      [idUsuario, inicio, fin]
    );

    const totalIngresos = Number(ingresos.rows[0].total);
    const totalGastos = Number(gastos.rows[0].total);

    return res.json({
      mensaje: "Reporte financiero mensual de FINAZZ",
      periodo: {
        mes,
        anio
      },
      total_ingresos: totalIngresos,
      total_gastos: totalGastos,
      balance: totalIngresos - totalGastos,
      gastos_por_categoria: categorias.rows.map(item => ({
        categoria: item.categoria,
        total: Number(item.total)
      }))
    });

  } catch (error) {
    console.error("Error al generar reporte:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo generar el reporte financiero"
    });
  }
});

// REPORTE ANUAL PARA GRAFICAS FINANCIERAS
router.get("/anual", verificarToken, async (req, res) => {
  try {
    const anio = Number(req.query.anio);

    if (
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100
    ) {
      return res.status(400).json({
        mensaje: "Debes indicar un año válido"
      });
    }

    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `WITH meses AS (
         SELECT generate_series(1, 12) AS mes
       ),
       ingresos_mensuales AS (
         SELECT
           EXTRACT(MONTH FROM fecha_registro)::integer AS mes,
           SUM(monto) AS total
         FROM ingresos
         WHERE id_usuario = $1
           AND fecha_registro >= make_date($2, 1, 1)
           AND fecha_registro < make_date($2 + 1, 1, 1)
         GROUP BY 1
       ),
       gastos_mensuales AS (
         SELECT
           EXTRACT(MONTH FROM fecha_registro)::integer AS mes,
           SUM(monto) AS total
         FROM gastos
         WHERE id_usuario = $1
           AND fecha_registro >= make_date($2, 1, 1)
           AND fecha_registro < make_date($2 + 1, 1, 1)
         GROUP BY 1
       )
       SELECT
         meses.mes,
         COALESCE(i.total, 0) AS ingresos,
         COALESCE(g.total, 0) AS gastos
       FROM meses
       LEFT JOIN ingresos_mensuales i ON i.mes = meses.mes
       LEFT JOIN gastos_mensuales g ON g.mes = meses.mes
       ORDER BY meses.mes`,
      [idUsuario, anio]
    );

    const nombresMeses = [
      "Enero", "Febrero", "Marzo", "Abril",
      "Mayo", "Junio", "Julio", "Agosto",
      "Septiembre", "Octubre", "Noviembre",
      "Diciembre"
    ];

    const datos = resultado.rows.map((fila) => {
      const ingresos = Number(fila.ingresos);
      const gastos = Number(fila.gastos);

      return {
        mes: fila.mes,
        nombre_mes: nombresMeses[fila.mes - 1],
        ingresos,
        gastos,
        balance: Number((ingresos - gastos).toFixed(2))
      };
    });

    return res.json({
      mensaje: "Reporte anual de FINAZZ",
      anio,
      datos
    });

  } catch (error) {
    console.error("Error al generar reporte anual:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo generar el reporte anual"
    });
  }
});

// REPORTE FINANCIERO POR RANGO DE FECHAS
router.get("/periodo", verificarToken, async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const fechaValida = (fecha) => {
      if (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ) {
        return false;
      }

      const fechaObjeto = new Date(fecha + "T00:00:00Z");

      return (
        !Number.isNaN(fechaObjeto.getTime()) &&
        fechaObjeto.toISOString().slice(0, 10) === fecha
      );
    };

    if (
      !fechaValida(desde) ||
      !fechaValida(hasta) ||
      desde > hasta
    ) {
      return res.status(400).json({
        mensaje: "Debes indicar un rango de fechas válido"
      });
    }

    const idUsuario = req.usuario.id_usuario;

    // CONSULTAR INGRESOS
    const ingresos = await pool.query(
      `SELECT
         COUNT(*)::integer AS cantidad,
         COALESCE(SUM(monto), 0) AS total
       FROM ingresos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < ($3::date + INTERVAL '1 day')`,
      [idUsuario, desde, hasta]
    );

    // CONSULTAR GASTOS
    const gastos = await pool.query(
      `SELECT
         COUNT(*)::integer AS cantidad,
         COALESCE(SUM(monto), 0) AS total
       FROM gastos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < ($3::date + INTERVAL '1 day')`,
      [idUsuario, desde, hasta]
    );

    // GASTOS POR CATEGORIA
    const categorias = await pool.query(
      `SELECT
         categoria,
         COUNT(*)::integer AS cantidad,
         SUM(monto) AS total
       FROM gastos
       WHERE id_usuario = $1
         AND fecha_registro >= $2::date
         AND fecha_registro < ($3::date + INTERVAL '1 day')
       GROUP BY categoria
       ORDER BY total DESC`,
      [idUsuario, desde, hasta]
    );

    const totalIngresos = Number(ingresos.rows[0].total);
    const totalGastos = Number(gastos.rows[0].total);

    return res.json({
      mensaje: "Reporte por periodo de FINAZZ",
      periodo: {
        desde,
        hasta
      },
      ingresos: {
        cantidad: ingresos.rows[0].cantidad,
        total: totalIngresos
      },
      gastos: {
        cantidad: gastos.rows[0].cantidad,
        total: totalGastos
      },
      balance: Number(
        (totalIngresos - totalGastos).toFixed(2)
      ),
      gastos_por_categoria: categorias.rows.map((item) => ({
        categoria: item.categoria,
        cantidad: item.cantidad,
        total: Number(item.total)
      }))
    });

  } catch (error) {
    console.error(
      "Error al generar reporte por periodo:",
      error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo generar el reporte por periodo"
    });
  }
});


module.exports = router;