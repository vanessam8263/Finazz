const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// FINAZZ PREMIUM BANKING
// MODULO DE PERFIL DE RIESGO

const horizontes = ["Corto", "Mediano", "Largo"];

function clasificarPerfil(puntuacion) {
  if (puntuacion <= 33) return "Conservador";
  if (puntuacion <= 66) return "Moderado";
  return "Agresivo";
}

// REGISTRAR EVALUACION DE RIESGO
router.post("/", verificarToken, async (req, res) => {
  try {
    const { puntuacion, horizonte_inversion } = req.body;

    if (
      !Number.isInteger(puntuacion) ||
      puntuacion < 0 ||
      puntuacion > 100 ||
      typeof horizonte_inversion !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Verifica la puntuacion y el horizonte de inversion"
      });
    }

    const horizonte = horizontes.find(
      valor =>
        valor.toLowerCase() ===
        horizonte_inversion.trim().toLowerCase()
    );

    if (!horizonte) {
      return res.status(400).json({
        mensaje: "El horizonte debe ser Corto, Mediano o Largo"
      });
    }

    const tipoPerfil = clasificarPerfil(puntuacion);

    const resultado = await pool.query(
      `INSERT INTO perfiles_riesgo
       (id_usuario, puntuacion, tipo_perfil, horizonte_inversion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        req.usuario.id_usuario,
        puntuacion,
        tipoPerfil,
        horizonte
      ]
    );

    return res.status(201).json({
      mensaje: "Perfil de riesgo registrado correctamente",
      perfil: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al registrar perfil:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar el perfil de riesgo"
    });
  }
});

// CONSULTAR EL PERFIL MAS RECIENTE
router.get("/", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT *
       FROM perfiles_riesgo
       WHERE id_usuario = $1
       ORDER BY fecha_evaluacion DESC, id_perfil DESC
       LIMIT 1`,
      [req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Todavia no tienes un perfil de riesgo"
      });
    }

    return res.json({
      mensaje: "Perfil de riesgo de FINAZZ",
      perfil: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al consultar perfil:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo consultar el perfil de riesgo"
    });
  }
});

module.exports = router;