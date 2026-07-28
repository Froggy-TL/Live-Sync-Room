// =============================================
// RUTAS DEL ADMINISTRADOR
// Panel de control para gestionar la reproducción y usuarios
// =============================================

import { Router } from "express";
import { getAllUsers, createUser, deleteUser } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Aplicar middleware de autenticación a todas las rutas de admin
router.use(requireAuth, requireAdmin);

// -----------------------------------------------
// GET /admin - Panel de control del administrador
// -----------------------------------------------
router.get("/admin", (req, res) => {
  // Obtener la lista de todos los usuarios registrados
  const users = getAllUsers();

  res.render("admin", {
    username: req.session.username,
    users,
  });
});

// -----------------------------------------------
// POST /admin/users - Crear nuevo usuario miembro
// -----------------------------------------------
router.post("/admin/users", (req, res) => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: string;
  };

  // Validar campos requeridos
  if (!username || !password) {
    const users = getAllUsers();
    res.render("admin", {
      username: req.session.username,
      users,
      userError: "Por favor completa usuario y contraseña.",
    });
    return;
  }

  // Validar que el rol sea válido
  const validRole = (role === "admin" || role === "member") ? role : "member";

  // Crear el usuario
  const result = createUser(username.trim(), password, validRole);

  if (!result.success) {
    const users = getAllUsers();
    res.render("admin", {
      username: req.session.username,
      users,
      userError: result.error,
    });
    return;
  }

  // Redirigir al panel para mostrar el usuario creado
  res.redirect("/admin?success=1");
});

// -----------------------------------------------
// POST /admin/users/delete - Eliminar un usuario
// -----------------------------------------------
router.post("/admin/users/delete", (req, res) => {
  const { userId } = req.body as { userId?: string };

  // No permitir eliminar al admin actual
  if (userId && parseInt(userId) !== req.session.userId) {
    deleteUser(parseInt(userId));
  }

  res.redirect("/admin");
});

export default router;
