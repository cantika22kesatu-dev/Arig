const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const app = express();
const server = http.createServer(app);

// Konfigurasi CORS agar Vercel Frontend bisa terhubung
const io = new Server(server, {
    cors: {
        origin: "*", // Mengizinkan semua origin (Vercel)
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
    res.send('✅ Web Terminal Backend Server Aktif!');
});

// Tentukan Shell (Linux/Mac = bash, Windows = powershell)
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

io.on('connection', (socket) => {
    console.log(`[+] Client terhubung: ${socket.id}`);

    // Spawn Terminal OS
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.env.USERPROFILE || '/tmp',
        env: process.env
    });

    // Kirim output terminal ke frontend
    ptyProcess.onData((data) => {
        socket.emit('output', data);
    });

    // Terima input ketikan dari frontend
    socket.on('input', (data) => {
        ptyProcess.write(data);
    });

    // Resize ukuran terminal
    socket.on('resize', ({ cols, rows }) => {
        try {
            ptyProcess.resize(cols, rows);
        } catch (err) {
            console.error('Resize Error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client terputus: ${socket.id}`);
        ptyProcess.kill();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server berjalan pada port ${PORT}`);
});