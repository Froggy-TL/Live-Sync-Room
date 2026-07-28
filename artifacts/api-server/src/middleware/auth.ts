// =============================================
// MIDDLEWARE DE AUTENTICACIÓN
// Protege rutas que requieren sesión activa
// =============================================

import type { Request, Response, NextFunction } from "express";

/** Verifica que el usuario esté autenticado (sesión activa) */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session.userId) {
    // Si no hay sesión, redirigir al login
    res.redirect("/login");
    return;
  }
  next();
}

/** Verifica que el usuario autenticado sea administrador */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.session.role !== "admin") {
    res.status(403).send("Acceso denegado: solo el administrador puede hacer esto.");
    return;
  }
  next();
}
