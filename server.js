const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// === CONFIGURACIÓN ===
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'clave_secreta_cambia_esto',
  resave: false,
  saveUninitialized: true
}));

// === BASE DE DATOS SQLite ===
const db = new Database('users.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);

// Crear usuario admin por defecto (si no existe)
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'admin');
}

// === VARIABLES GLOBALES DE LA SALA ===
let currentSong = {
  name: 'Ninguna canción seleccionada',
  artist: 'Esperando...',
  url: '',
  isPlaying: false,
  currentTime: 0
};

// === RUTAS ===
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Usuario o contraseña incorrectos' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const user = req.session.user;
  if (user.role === 'admin') {
    return res.render('admin', { user, song: currentSong });
  } else {
    return res.render('member', { user, song: currentSong });
  }
});

// Ruta para que el admin agregue miembros
app.post('/add-member', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).send('No autorizado');
  const { username, password } = req.body;
  if (!username || !password) return res.redirect('/dashboard');
  try {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashed, 'member');
  } catch (e) {
    console.log('Error al crear miembro:', e.message);
  }
  res.redirect('/dashboard');
});

// === SOCKET.IO (COMUNICACIÓN EN VIVO) ===
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');

  // Enviar estado actual al conectarse
  socket.emit('song-update', currentSong);

  // Escuchar cambios del admin
  socket.on('admin-change-song', (data) => {
    // Actualizar variables globales
    currentSong.name = data.name || 'Sin título';
    currentSong.artist = data.artist || 'Desconocido';
    currentSong.url = data.url || '';
    currentSong.isPlaying = data.isPlaying || false;
    currentSong.currentTime = data.currentTime || 0;

    // Emitir a TODOS los miembros
    io.emit('song-update', currentSong);
  });

  socket.on('admin-play-pause', (isPlaying) => {
    currentSong.isPlaying = isPlaying;
    io.emit('song-update', currentSong);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

// === INICIAR SERVIDOR ===
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});