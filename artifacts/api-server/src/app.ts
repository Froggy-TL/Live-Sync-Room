// =============================================
// APLICACIÓN EXPRESS
// Configuración central del servidor web
// =============================================

import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import path from "node:path";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import memberRouter from "./routes/member.js";
import healthRouter from "./routes/health.js";

const app: Express = express();

// -----------------------------------------------
// Middleware de logging con Pino
// -----------------------------------------------
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// -----------------------------------------------
// Middlewares generales
// -----------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------
// Configuración del motor de plantillas EJS
// Las vistas están en la carpeta 'views' junto al bundle
// -----------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// -----------------------------------------------
// Configuración de sesiones con express-session
// El secreto viene de la variable de entorno SESSION_SECRET
// -----------------------------------------------
export const sessionMiddleware = session({
  secret: process.env["SESSION_SECRET"] ?? "sala-escucha-secreto-cambiar",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,         // true en producción con HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
  },
});

app.use(sessionMiddleware);

// -----------------------------------------------
// Rutas de la aplicación
// -----------------------------------------------

// Ruta raíz: redirigir al login o al panel según la sesión
app.get("/", (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
  } else if (req.session.role === "admin") {
    res.redirect("/admin");
  } else {
    res.redirect("/member");
  }
});

// Rutas de autenticación (login, logout)
app.use(authRouter);

// Rutas del administrador
app.use(adminRouter);

// Rutas del miembro
app.use(memberRouter);

// Rutas de la API (health check)
app.use("/api", healthRouter);

export default app;
