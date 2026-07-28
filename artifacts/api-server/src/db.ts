// =============================================
// BASE DE DATOS - SQLite nativo (node:sqlite)
// Disponible en Node.js 22+ sin dependencias externas
// =============================================

import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "node:path";

// Ruta al archivo de la base de datos
// __dirname = artifacts/api-server/dist (en producción)
// Guardamos la DB en el nivel del paquete, no en dist
const DB_PATH = path.join(__dirname, "../sala_escucha.db");

// Crear o abrir la base de datos SQLite (sincrónica)
export const db = new DatabaseSync(DB_PATH);

// -----------------------------------------------
// Definición de tipos
// -----------------------------------------------
export interface User {
  id: number;
  username: string;
  password: string;
  role: "admin" | "member";
}

// -----------------------------------------------
// Inicialización de la base de datos
// -----------------------------------------------
export function initializeDatabase(): void {
  // Crear tabla de usuarios si no existe
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT    UNIQUE NOT NULL,
      password TEXT    NOT NULL,
      role     TEXT    NOT NULL CHECK(role IN ('admin', 'member'))
    )
  `);

  // Crear el usuario administrador por defecto si no existe
  const stmt = db.prepare("SELECT id FROM users WHERE username = ?");
  const adminExists = stmt.get("Froggy");

  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync("Tilt1628", 10);
    db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    ).run("Froggy", hashedPassword, "admin");
    console.log('✅ Usuario admin "Froggy" creado correctamente.');
  }
}

// -----------------------------------------------
// Consultas de usuarios
// -----------------------------------------------

/** Busca un usuario por su nombre de usuario */
export function getUserByUsername(username: string): User | undefined {
  return db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as User | undefined;
}

/** Obtiene todos los usuarios (sin contraseña) */
export function getAllUsers(): Omit<User, "password">[] {
  return db
    .prepare("SELECT id, username, role FROM users ORDER BY role, username")
    .all() as Omit<User, "password">[];
}

/** Crea un nuevo usuario con contraseña hasheada */
export function createUser(
  username: string,
  password: string,
  role: "admin" | "member"
): { success: boolean; error?: string } {
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    ).run(username, hashedPassword, role);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return { success: false, error: "El nombre de usuario ya existe" };
    }
    return { success: false, error: "Error al crear el usuario" };
  }
}

/** Elimina un usuario por ID */
export function deleteUser(id: number): void {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

/** Verifica si una contraseña coincide con el hash guardado */
export function verifyPassword(plainPassword: string, hash: string): boolean {
  return bcrypt.compareSync(plainPassword, hash);
}
