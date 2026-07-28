// =============================================
// RUTAS DEL MIEMBRO
// Interfaz de escucha para usuarios normales
// =============================================

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// -----------------------------------------------
// GET /member - Interfaz del oyente
// -----------------------------------------------
router.get("/member", requireAuth, (req, res) => {
  // Si es admin, redirigir al panel de control
  if (req.session.role === "admin") {
    res.redirect("/admin");
    return;
  }

  res.render("member", {
    username: req.session.username,
  });
});

export default router;
