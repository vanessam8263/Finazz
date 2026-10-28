
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verificarToken = require("../middleware/auth");

// 1. REGISTRAR USUARIO
router.post("/registro", async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    // Validar campos obligatorios
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof correo !== "string" ||
      !correo.trim() ||
      typeof contrasena !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios"
      });
    }

    // Validar longitud de contraseña
    if (
      contrasena.length < 8 ||
      Buffer.byteLength(contrasena, "utf8") > 72
    ) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes"
      });
    }

    // Validar nombre y correo
    if (nombre.trim().length > 100) {
      return res.status(400).json({
        mensaje: "El nombre es demasiado largo"
      });
    }

    const correoLimpio = correo.trim().toLowerCase();

    if (
      correoLimpio.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
    ) {
      return res.status(400).json({
        mensaje: "Ingresa un correo electrónico válido"
      });
    }

    // Verificar si el correo ya está registrado
    const usuarioExistente = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE LOWER(correo) = $1",
      [correoLimpio]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(409).json({
        mensaje: "Este correo ya está registrado"
      });
    }

    // Cifrar contraseña
    const contrasenaCifrada = await bcrypt.hash(
      contrasena,
      10
    );

    // Guardar usuario
    const resultado = await pool.query(
      `INSERT INTO usuarios
       (nombre, correo, contrasena)
       VALUES ($1, $2, $3)
       RETURNING id_usuario, nombre, correo`,
      [
        nombre.trim(),
        correoLimpio,
        contrasenaCifrada
      ]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente en FINAZZ",
      usuario: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Este correo ya está registrado"
      });
    }

    console.error("Error al registrar usuario:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo registrar el usuario"
    });
  }
});

// ==========================================
// 2. INICIAR SESION
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (
      typeof correo !== "string" ||
      !correo.trim() ||
      typeof contrasena !== "string" ||
      !contrasena
    ) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios"
      });
    }

    // Buscar usuario
    const resultado = await pool.query(
      `SELECT id_usuario, nombre, correo, contrasena
       FROM usuarios
       WHERE LOWER(correo) = $1`,
      [correo.trim().toLowerCase()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos"
      });
    }

    const usuario = resultado.rows[0];

    // Comparar contraseña
    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos"
      });
    }

    // Generar token de acceso
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );

    return res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo
      }
    });

  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo iniciar sesión"
    });
  }
});

// ==========================================
// 3. CONSULTAR PERFIL DEL USUARIO
// ==========================================

router.get("/perfil", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_usuario, nombre, correo
       FROM usuarios
       WHERE id_usuario = $1`,
      [req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    return res.json({
      mensaje: "Perfil de usuario de FINAZZ",
      usuario: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al consultar perfil:", error.message);

    return res.status(500).json({
      mensaje: "No se pudo consultar el perfil"
    });
  }
});

module.exports = router;
