const express = require("express");
const cors = require("cors");
const pool = require("./db");
const usuariosRoutes = require("./routes/usuarios");
const ingresosRoutes = require("./routes/ingresos");
const gastosRoutes = require("./routes/gastos");
const balanceRoutes = require("./routes/balance");
const metasRoutes = require("./routes/metas");
const riesgoRoutes = require("./routes/riesgo");
const presupuestosRoutes = require("./routes/presupuestos");
const deudasRoutes = require("./routes/deudas");
const reportesRoutes = require("./routes/reportes");


require("dotenv").config();

const app = express();

// Configuración
app.use(cors());
app.use(express.json());

// Rutas de usuarios
app.use("/api/usuarios", usuariosRoutes);

// Rutas de ingresos
app.use("/api/ingresos", ingresosRoutes);

app.use("/api/gastos", gastosRoutes);

app.use("/api/balance", balanceRoutes);

app.use("/api/metas", metasRoutes);

app.use("/api/riesgo", riesgoRoutes);

app.use("/api/presupuestos", presupuestosRoutes);

app.use("/api/deudas", deudasRoutes);

app.use("/api/reportes", reportesRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.send("¡Bienvenido a FINAZZ! Servidor funcionando correctamente.");
});

// Comprobar conexión con PostgreSQL
app.get("/api/test-db", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT NOW() AS fecha_servidor"
    );

    res.json({
      mensaje: "FINAZZ conectado a PostgreSQL correctamente",
      fecha: resultado.rows[0].fecha_servidor,
    });
  } catch (error) {
    console.error("Error de conexión:", error.message);

    res.status(500).json({
      mensaje: "No se pudo conectar con PostgreSQL",
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor FINAZZ funcionando en http://localhost:${PORT}`);
});