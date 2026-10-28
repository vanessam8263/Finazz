
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Leaf } from "lucide-react";
import { iniciarSesion as loginAPI } from "../services/authService";
import "./Login.css";

function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // CONEXIÓN REAL CON EL BACKEND DE FINAZZ
  const iniciarSesion = async (e) => {
    e.preventDefault();si 
    setError("");

    if (!correo.trim() || !contrasena) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    try {
      setCargando(true);

      // Enviar credenciales al backend
      const usuario = await loginAPI(
        correo.trim(),
        contrasena
      );

      // Inicio de sesión exitoso
      alert(`¡Bienvenido a FINAZZ, ${usuario.nombre}!`);

      // Próximo paso: navegar al Dashboard
      // cuando configuremos las rutas de React Router.

    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      if (error.response) {
        setError(
          error.response.data?.mensaje ||
          "Correo o contraseña incorrectos."
        );
      } else if (error.request) {
        setError(
          "No se pudo conectar con el servidor de FINAZZ. Verifica que el backend esté encendido."
        );
      } else {
        setError(
          error.message ||
          "Ocurrió un error inesperado."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">

      {/* PANEL IZQUIERDO */}
      <section className="login-brand">

        <div className="login-logo">
          <Leaf size={30} />
          <span>FINAZZ</span>
        </div>

        <div className="login-brand-content">
          <span className="login-eyebrow">
            TU BIENESTAR FINANCIERO
          </span>

          <h1>
            Tu dinero,
            <br />
            tu futuro.
          </h1>

          <p>
            Organiza tus finanzas, alcanza tus metas
            y construye la tranquilidad que mereces.
          </p>

          <div className="login-decoration">
            <Leaf size={100} strokeWidth={0.7} />
          </div>
        </div>

        <p className="login-brand-footer">
          FINAZZ · Tu estabilidad financiera,
          nuestra prioridad.
        </p>

      </section>

      {/* PANEL DERECHO */}
      <section className="login-form-section">

        <div className="login-form-container">

          {/* LOGO PARA CELULARES */}
          <div className="login-mobile-logo">
            <Leaf size={24} />
            <span>FINAZZ</span>
          </div>

          <span className="login-welcome">
            BIENVENIDO A FINAZZ
          </span>

          <h2>Inicia sesión</h2>

          <p className="login-description">
            Ingresa a tu espacio financiero personal.
          </p>

          {/* FORMULARIO */}
          <form onSubmit={iniciarSesion}>

            {/* CORREO */}
            <label htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="email"
              maxLength={255}
              required
            />

            {/* CONTRASEÑA */}
            <label htmlFor="contrasena">
              Contraseña
            </label>

            <div className="login-password">

              <input
                id="contrasena"
                type={mostrar ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={contrasena}
                onChange={(e) =>
                  setContrasena(e.target.value)
                }
                autoComplete="current-password"
                required
              />

              {/* MOSTRAR / OCULTAR CONTRASEÑA */}
              <button
                type="button"
                className="login-eye"
                onClick={() => setMostrar(!mostrar)}
                aria-label={
                  mostrar
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrar ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>

            </div>

            {/* MENSAJES DE ERROR */}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {/* BOTÓN DE INICIAR SESIÓN */}
            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight size={19} />
                </>
              )}
            </button>

          </form>

          {/* REGISTRO */}
          <p className="login-register">
            ¿Aún no tienes una cuenta?{" "}
            <span>
              Próximamente: crear cuenta
            </span>
          </p>

          {/* PIE DE PÁGINA */}
          <p className="login-copyright">
            © 2026 FINAZZ. Todos los derechos reservados.
          </p>

        </div>
      </section>
    </div>
  );
}

export default Login;
