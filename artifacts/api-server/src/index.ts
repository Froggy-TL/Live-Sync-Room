// =============================================
// PUNTO DE ENTRADA DEL SERVIDOR
// Crea el servidor HTTP, integra Socket.IO y arranca
// =============================================

import { createServer } from "node:http";
import app, { sessionMiddleware } from "./app.js";
import { setupSocketIO } from "./socket.js";
import { initializeDatabase } from "./db.js";
import { logger } from "./lib/logger.js";

// -----------------------------------------------
// Leer el puerto desde variables de entorno
// -----------------------------------------------
const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// -----------------------------------------------
// Inicializar la base de datos SQLite
// Crea tablas y el usuario admin "Froggy" si no existe
// -----------------------------------------------
initializeDatabase();

// -----------------------------------------------
// Crear el servidor HTTP a partir de la app Express
// Necesario para que Socket.IO comparta el mismo puerto
// -----------------------------------------------
const httpServer = createServer(app);

// -----------------------------------------------
// Configurar Socket.IO sobre el servidor HTTP
// Le pasamos el middleware de sesión para autenticación
// -----------------------------------------------
setupSocketIO(httpServer, sessionMiddleware);

// -----------------------------------------------
// Iniciar el servidor
// -----------------------------------------------
httpServer.listen(port, () => {
  logger.info({ port }, "🎵 Sala de Escucha iniciada — servidor escuchando");
});
