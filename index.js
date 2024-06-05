import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import pool from './db.js'; // Importa la configuración de la base de datos
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*'
    }
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Manejar conexiones de clientes
io.on('connection', async (socket) => {
    console.log('Cliente conectado');
    const { username, serverOffset } = socket.handshake.auth;
    console.log(`Cliente conectado: ${socket.id}, Usuario: ${username}, Server Offset: ${serverOffset}`);

    // Recuperar mensajes anteriores y enviarlos al cliente que se conecta
    try {
        const [rows] = await pool.query('SELECT * FROM messages');
        socket.emit('previousMessages', rows.map(row => ({ username: row.username, message: row.message })));
    } catch (error) {
        console.error('Error retrieving previous messages:', error);
    }

    // Manejar mensajes del cliente
    socket.on('message', async (message) => {
        console.log(`Mensaje recibido: ${socket.id}, Usuario: ${username}`, message);
        
        // Guardar mensaje en la base de datos
        try {
            await pool.query('INSERT INTO messages (username, message) VALUES (?, ?)', [username, message]);
        } catch (error) {
            console.error('Error saving message:', error);
        }

        // Enviar mensaje a todos los clientes
        const msgObj = { username, message };
        io.emit('message', msgObj);
    });

    // Manejar desconexiones
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Socket.IO iniciado en [localhost]:${PORT}`);
});
