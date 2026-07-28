// =============================================
// SOCKET.IO - Sincronización en tiempo real
// Maneja eventos de reproducción entre admin y miembros
// =============================================

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import type { RequestHandler } from "express";

// -----------------------------------------------
// Estado global de reproducción en el servidor
// Esto es la "fuente de verdad" para todos los clientes
// -----------------------------------------------
interface SongState {
  url: string;        // URL directa del archivo de audio
  name: string;       // Nombre de la canción
  artist: string;     // Nombre del artista
  isPlaying: boolean; // ¿Está sonando ahora?
  currentTime: number;    // Segundo exacto donde está la canción
  playStartedAt: number;  // Timestamp (Date.now()) cuando se dio play
}

let songState: SongState = {
  url: "",
  name: "Sin canción cargada",
  artist: "",
  isPlaying: false,
  currentTime: 0,
  playStartedAt: 0,
};

// Lista de miembros conectados: socketId → username
const connectedMembers = new Map<string, string>();

// -----------------------------------------------
// Función que calcula el tiempo actual sincronizado
// Si la canción está sonando, suma el tiempo transcurrido
// -----------------------------------------------
function getCalculatedCurrentTime(): number {
  if (songState.isPlaying && songState.playStartedAt > 0) {
    const elapsedSeconds = (Date.now() - songState.playStartedAt) / 1000;
    return songState.currentTime + elapsedSeconds;
  }
  return songState.currentTime;
}

// -----------------------------------------------
// Configuración del servidor Socket.IO
// -----------------------------------------------
export function setupSocketIO(
  httpServer: HTTPServer,
  sessionMiddleware: RequestHandler
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    // Configuración de CORS para desarrollo
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Compartir el middleware de sesión con Socket.IO
  // Así podemos leer req.session dentro de los handlers de socket
  io.use((socket, next) => {
    sessionMiddleware(socket.request as Parameters<RequestHandler>[0], {} as Parameters<RequestHandler>[1], next);
  });

  // -----------------------------------------------
  // Conexión de un nuevo cliente
  // -----------------------------------------------
  io.on("connection", (socket) => {
    // Leer los datos de sesión del usuario conectado
    const req = socket.request as { session?: { username?: string; role?: string } };
    const username = req.session?.username ?? "Desconocido";
    const role = req.session?.role ?? "member";

    // Guardar datos en el socket para uso posterior
    socket.data.username = username;
    socket.data.role = role;

    // Registrar miembro conectado (solo members)
    if (role === "member") {
      connectedMembers.set(socket.id, username);
      // Notificar a todos (especialmente al admin) que hay un nuevo miembro
      io.emit("members:update", Array.from(connectedMembers.values()));
    }

    // Enviar el estado actual de reproducción al nuevo cliente
    // Calculamos el tiempo real para sincronización exacta
    socket.emit("sync:state", {
      ...songState,
      currentTime: getCalculatedCurrentTime(),
      serverTime: Date.now(),
    });

    // -----------------------------------------------
    // Eventos del ADMINISTRADOR → Servidor
    // -----------------------------------------------

    /** Admin da PLAY */
    socket.on("admin:play", (data: { currentTime: number }) => {
      if (socket.data.role !== "admin") return; // Solo el admin puede controlar

      const now = Date.now();
      songState.isPlaying = true;
      songState.currentTime = data.currentTime ?? 0;
      songState.playStartedAt = now;

      // Transmitir a TODOS los clientes conectados
      io.emit("sync:play", {
        currentTime: songState.currentTime,
        serverTime: now,
      });
    });

    /** Admin da PAUSE */
    socket.on("admin:pause", (data: { currentTime: number }) => {
      if (socket.data.role !== "admin") return;

      songState.isPlaying = false;
      songState.currentTime = data.currentTime ?? getCalculatedCurrentTime();
      songState.playStartedAt = 0;

      // Transmitir pausa a todos
      io.emit("sync:pause", {
        currentTime: songState.currentTime,
      });
    });

    /** Admin cambia la canción */
    socket.on(
      "admin:changeSong",
      (data: { url: string; name: string; artist: string }) => {
        if (socket.data.role !== "admin") return;

        songState.url = data.url ?? "";
        songState.name = data.name ?? "Sin título";
        songState.artist = data.artist ?? "";
        songState.isPlaying = false;
        songState.currentTime = 0;
        songState.playStartedAt = 0;

        // Transmitir la nueva canción a todos
        io.emit("sync:changeSong", {
          url: songState.url,
          name: songState.name,
          artist: songState.artist,
          currentTime: 0,
        });
      }
    );

    // -----------------------------------------------
    // Desconexión de un cliente
    // -----------------------------------------------
    socket.on("disconnect", () => {
      if (connectedMembers.has(socket.id)) {
        connectedMembers.delete(socket.id);
        // Actualizar la lista de miembros para el admin
        io.emit("members:update", Array.from(connectedMembers.values()));
      }
    });
  });

  return io;
}
