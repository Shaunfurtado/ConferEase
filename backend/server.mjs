// backend\server.mjs
import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import sessionRoutes from './routes/sessions.mjs';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes);

const server = http.createServer(app);
const io = new SocketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store sessions and their participants
const sessions = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // Handle client disconnection from a session
        for (const sessionId in sessions) {
            sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
            if (sessions[sessionId].length === 0) {
                delete sessions[sessionId];
            }
        }
    });

    // Handle client joining a session
    socket.on('join-session', ({ sessionId }) => {
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }
        sessions[sessionId].push(socket.id);
        socket.join(sessionId);
    });

    // Handle signaling data
    socket.on('offer', (data) => {
        const { sessionId, offer } = data;
        socket.to(sessionId).emit('offer', offer);
    });

    socket.on('answer', (data) => {
        const { sessionId, answer } = data;
        socket.to(sessionId).emit('answer', answer);
    });

    socket.on('ice-candidate', (data) => {
        const { sessionId, candidate } = data;
        socket.to(sessionId).emit('ice-candidate', candidate);
    });

    // Handle end call
    socket.on('end-call', ({ sessionId }) => {
        io.to(sessionId).emit('end-call');
        // Clean up session data
        delete sessions[sessionId];
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
