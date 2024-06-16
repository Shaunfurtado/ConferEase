// backend\server.mjs
import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import sessionRoutes from './routes/sessions.mjs'; // Ensure correct import
import Redis from 'ioredis';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes); // Ensure this is correctly defined

const server = http.createServer(app);
const io = new SocketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const redis = new Redis();
const redisSub = new Redis(); // Separate instance for subscribing to Redis channels

// Store sessions and their participants
const sessions = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        for (const sessionId in sessions) {
            sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
            if (sessions[sessionId].length === 0) {
                delete sessions[sessionId];
            }
        }
    });

    // Handle client joining a session
    socket.on('join-session', async ({ sessionId }) => {
        const clientId = socket.id;

        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }
        sessions[sessionId].push(clientId);
        socket.join(sessionId);
        redisSub.subscribe(sessionId); // Subscribe to Redis channel for the session

        // Send updated client list to all clients
        const creatorId = await redis.get(`session:${sessionId}:creatorId`);
        const clients = sessions[sessionId].map(id => ({
            id,
            isCreator: id === creatorId
        }));
        io.to(sessionId).emit('client-update', clients);
    });

    // Handle signaling data
    socket.on('offer', (data) => {
        const { sessionId, offer } = data;
        socket.to(sessionId).emit('offer', offer);
        redis.publish(sessionId, JSON.stringify({ type: 'offer', offer }));
    });

    socket.on('answer', (data) => {
        const { sessionId, answer } = data;
        socket.to(sessionId).emit('answer', answer);
        redis.publish(sessionId, JSON.stringify({ type: 'answer', answer }));
    });

    socket.on('ice-candidate', (data) => {
        const { sessionId, candidate } = data;
        socket.to(sessionId).emit('ice-candidate', candidate);
        redis.publish(sessionId, JSON.stringify({ type: 'ice-candidate', candidate }));
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
        const { sessionId, sender, message } = data;
        redis.publish(sessionId, JSON.stringify({ type: 'chat-message', sender, message }));
    });

    // Handle end call by admin
    socket.on('end-call', async ({ sessionId, userId }) => {
        const creatorId = await redis.get(`session:${sessionId}:creatorId`);
        if (creatorId === userId) {
            io.to(sessionId).emit('end-call');
            redis.publish(sessionId, JSON.stringify({ type: 'end-call' }));
            delete sessions[sessionId];
        }
    });

    // Handle leave call by client
    socket.on('leave-call', ({ sessionId }) => {
        socket.leave(sessionId);
        sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);

        // Update client list
        redis.get(`session:${sessionId}:creatorId`).then(creatorId => {
            const clients = sessions[sessionId].map(id => ({
                id,
                isCreator: id === creatorId
            }));
            io.to(sessionId).emit('client-update', clients);
        });
    });
});

// Handle Redis messages
redisSub.on('message', (channel, message) => {
    const parsedMessage = JSON.parse(message);
    io.to(channel).emit(parsedMessage.type, parsedMessage);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
