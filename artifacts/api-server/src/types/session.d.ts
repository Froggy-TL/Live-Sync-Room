// Extensión de tipos para express-session
// Define los datos que guardamos en la sesión del usuario
declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: "admin" | "member";
  }
}

export {};
