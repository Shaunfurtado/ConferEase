// backend\server.mjs
import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import sessionRoutes from './routes/sessions.mjs';
import Redis from 'ioredis';
import axios from 'axios'; // For PocketBase verification
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

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

const redis = new Redis();
const redisSub = new Redis();

// Store sessions and their participants
const sessions = {};

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        for (const sessionId in sessions) {
            if (sessions[sessionId]) {
                sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
                if (sessions[sessionId].length === 0) {
                    delete sessions[sessionId];
                } else {
                    try {
                        await redis.del(`session:${sessionId}:nickname:${socket.id}`);
                    } catch (error) {
                        console.error('Error deleting nickname from Redis:', error);
                    }
                    const clients = await getSessionClients(sessionId);
                    io.to(sessionId).emit('client-update', clients);
                    io.to(sessionId).emit('notification', `${socket.id} has disconnected.`);
                }
            }
        }
    });

    socket.on('join-session', async ({ sessionId, clientId, nickname }) => {
        try {
            console.log(`Client ${clientId} joining session ${sessionId} with nickname ${nickname}`);

            // Set the creatorId if this is the first client to join the session
            let creatorId = await redis.get(`session:${sessionId}:creatorId`);
            if (!creatorId) {
                creatorId = clientId;
                await redis.set(`session:${sessionId}:creatorId`, clientId);
                console.log(`Creator ID for session ${sessionId} is set to ${clientId}`);
            }

            if (!sessions[sessionId]) {
                sessions[sessionId] = [];
            }
            sessions[sessionId].push(clientId);
            socket.join(sessionId);

            await redis.set(`session:${sessionId}:nickname:${clientId}`, nickname);

            redisSub.subscribe(sessionId);

            const clients = await getSessionClients(sessionId);
            io.to(sessionId).emit('client-update', clients);
            io.to(sessionId).emit('notification', `${nickname} has joined the session.`);
        } catch (error) {
            console.error('Error joining session:', error);
        }
    });

    socket.on('offer', (data) => {
        const { sessionId, offer } = data;
        socket.to(sessionId).emit('offer', offer);
        console.log(`Offer sent for session ${sessionId}`);
        redis.publish(sessionId, JSON.stringify({ type: 'offer', offer }));
    });

    socket.on('answer', (data) => {
        const { sessionId, answer } = data;
        socket.to(sessionId).emit('answer', answer);
        console.log(`Answer sent for session ${sessionId}`);
        redis.publish(sessionId, JSON.stringify({ type: 'answer', answer }));
    });

    socket.on('ice-candidate', (data) => {
        const { sessionId, candidate } = data;
        socket.to(sessionId).emit('ice-candidate', candidate);
        console.log(`ICE candidate sent for session ${sessionId}`);
        redis.publish(sessionId, JSON.stringify({ type: 'ice-candidate', candidate }));
    });

    socket.on('chat-message', (data) => {
        const { sessionId, sender, message } = data;
        redis.publish(sessionId, JSON.stringify({ type: 'chat-message', sender, message }));
        console.log(`Chat message sent by ${sender} in session ${sessionId}`);
    });

    socket.on('end-call', async ({ sessionId, userId }) => {
        try {
            const creatorId = await redis.get(`session:${sessionId}:creatorId`);
            console.log(`End call request for session ${sessionId} by user ${userId}. Creator ID is ${creatorId}.`);
            
            if (creatorId === userId) {
                io.to(sessionId).emit('end-call');
                delete sessions[sessionId];
                const keys = await redis.keys(`session:${sessionId}:nickname:*`);
                await redis.del(...keys);
                await redis.del(`session:${sessionId}:creatorId`);
                console.log(`Call ended for session ${sessionId} by creator ${creatorId}.`);
            } else {
                console.log(`User ${userId} is not the creator of session ${sessionId}. End call denied.`);
            }
        } catch (error) {
            console.error('Error ending call:', error);
        }
    });

    socket.on('leave-call', async ({ sessionId }) => {
        try {
            console.log(`Leave call requested for session ${sessionId} by client ${socket.id}`);
            if (sessions[sessionId]) {
                await redis.del(`session:${sessionId}:nickname:${socket.id}`);
                socket.leave(sessionId);
                sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);

                const clients = await getSessionClients(sessionId);
                io.to(sessionId).emit('client-update', clients);
                io.to(sessionId).emit('notification', `${socket.id} has left the call.`);
            } else {
                console.log(`Session ${sessionId} does not exist for client ${socket.id}`);
            }
        } catch (error) {
            console.error('Error leaving call:', error);
        }
    });
});

// Function to get session clients with their nicknames
const getSessionClients = async (sessionId) => {
    if (!sessions[sessionId]) return [];
    const clients = await Promise.all(sessions[sessionId].map(async id => {
        const nick = await redis.get(`session:${sessionId}:nickname:${id}`);
        return {
            clientId: id,
            nickname: nick || id
        };
    }));
    return clients;
};

redisSub.on('message', (channel, message) => {
    const parsedMessage = JSON.parse(message);
    io.to(channel).emit(parsedMessage.type, parsedMessage);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

