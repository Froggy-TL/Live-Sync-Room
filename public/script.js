const socket = io();

// Variables globales
let currentSongData = null;
let audioElement = null;

// Identificar si estamos en admin o member
const isAdmin = window.location.pathname.includes('admin');

// Obtener el elemento de audio según la página
if (isAdmin) {
  audioElement = document.getElementById('admin-audio');
} else {
  audioElement = document.getElementById('member-audio');
}

// --- ESCUCHAR ACTUALIZACIONES DEL SERVIDOR ---
socket.on('song-update', (data) => {
  currentSongData = data;
  
  // Actualizar la interfaz (nombre, artista, URL)
  document.querySelectorAll('#song-name, #display-name').forEach(el => el.textContent = data.name || 'Sin título');
  document.querySelectorAll('#song-artist, #display-artist').forEach(el => el.textContent = data.artist || 'Desconocido');
  document.querySelectorAll('#song-url, #display-url').forEach(el => el.textContent = data.url || 'Sin URL');
  
  // Si la URL cambió, actualizar el src del audio
  if (audioElement && data.url) {
    if (audioElement.src !== data.url) {
      audioElement.src = data.url;
      audioElement.load(); // Recargar para aplicar nuevo src
    }
  }
  
  // Sincronizar tiempo y estado de reproducción
  if (audioElement) {
    // Ajustar tiempo (si la diferencia es mayor a 0.5 segundos)
    if (Math.abs(audioElement.currentTime - data.currentTime) > 0.5) {
      audioElement.currentTime = data.currentTime;
    }
    if (data.isPlaying) {
      audioElement.play().catch(e => console.log('Error al reproducir:', e));
    } else {
      audioElement.pause();
    }
  }
  
  // Actualizar texto de estado (para miembros)
  const statusText = document.getElementById('status-text');
  if (statusText) {
    statusText.textContent = data.isPlaying ? '▶ Reproduciendo...' : '⏸ En pausa';
  }
});

// --- LÓGICA PARA EL ADMINISTRADOR ---
if (isAdmin) {
  // Botón: Cambiar canción
  document.getElementById('btn-change')?.addEventListener('click', () => {
    const name = document.getElementById('new-name').value;
    const artist = document.getElementById('new-artist').value;
    const url = document.getElementById('new-url').value;
    
    if (!url) {
      alert('Por favor ingresa una URL de audio');
      return;
    }
    
    const data = {
      name: name || 'Sin título',
      artist: artist || 'Desconocido',
      url: url,
      isPlaying: false, // Por defecto en pausa al cambiar
      currentTime: 0
    };
    
    // Actualizar localmente
    if (audioElement) {
      audioElement.src = url;
      audioElement.load();
    }
    
    socket.emit('admin-change-song', data);
  });
  
  // Botón: Reproducir
  document.getElementById('btn-play')?.addEventListener('click', () => {
    if (audioElement) {
      audioElement.play();
      socket.emit('admin-play-pause', true);
    }
  });
  
  // Botón: Pausar
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    if (audioElement) {
      audioElement.pause();
      socket.emit('admin-play-pause', false);
    }
  });
  
  // Actualizar tiempo cada segundo (para sincronización)
  setInterval(() => {
    if (audioElement && currentSongData) {
      // Enviar tiempo actualizado al servidor (solo si está sonando)
      if (!audioElement.paused) {
        socket.emit('admin-change-song', {
          ...currentSongData,
          currentTime: audioElement.currentTime,
          isPlaying: true
        });
      }
    }
  }, 2000); // Cada 2 segundos
}