
import { useNavigate } from "react-router-dom";
import { cerrarSesion } from "../services/authService";

function Dashboard() {
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F3EDE3",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "#171A17" }}>
        Bienvenido a FINAZZ 💚
      </h1>

      <p>
        Tu espacio financiero está listo.
      </p>

      <button
        onClick={salir}
        style={{
          backgroundColor: "#171A17",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "10px",
          padding: "14px 25px",
          cursor: "pointer",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default Dashboard;
