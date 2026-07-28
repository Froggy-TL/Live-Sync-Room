// =============================================
// RUTAS DE AUTENTICACIÓN
// Login y logout de usuarios
// =============================================

import { Router } from "express";
import { getUserByUsername, verifyPassword } from "../db.js";

const router = Router();

// -----------------------------------------------
// GET /login - Mostrar formulario de inicio de sesión
// -----------------------------------------------
router.get("/login", (req, res) => {
  // Si ya tiene sesión activa, redirigir según su rol
  if (req.session.userId) {
    if (req.session.role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/member");
    }
    return;
  }
  // Renderizar la vista de login (sin error)
  res.render("login", { error: null });
});

// -----------------------------------------------
// POST /login - Procesar inicio de sesión
// -----------------------------------------------
router.post("/login", (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  // Validar que se enviaron los campos
  if (!username || !password) {
    res.render("login", { error: "Por favor completa todos los campos." });
    return;
  }

  // Buscar al usuario en la base de datos
  const user = getUserByUsername(username.trim());

  // Verificar que el usuario existe y la contraseña es correcta
  if (!user || !verifyPassword(password, user.password)) {
    res.render("login", {
      error: "Usuario o contraseña incorrectos.",
    });
    return;
  }

  // Guardar datos en la sesión
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  // Redirigir según el rol del usuario
  if (user.role === "admin") {
    res.redirect("/admin");
  } else {
    res.redirect("/member");
  }
});

// -----------------------------------------------
// GET /logout - Cerrar sesión
// -----------------------------------------------
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

export default router;
