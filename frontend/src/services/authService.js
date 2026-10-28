
import api from "./api";

export const iniciarSesion = async (correo, contrasena) => {
  const respuesta = await api.post("/usuarios/login", {
    correo,
    contrasena,
  });

  const { token, usuario } = respuesta.data;

  if (!token || !usuario) {
    throw new Error("Respuesta de inicio de sesión inválida");
  }

  sessionStorage.setItem("finazz_token", token);

  return usuario;
};

export const obtenerPerfil = async () => {
  const respuesta = await api.get("/usuarios/perfil");
  return respuesta.data.usuario;
};

export const cerrarSesion = () => {
  sessionStorage.removeItem("finazz_token");
};

export const obtenerToken = () => {
  return sessionStorage.getItem("finazz_token");
};
