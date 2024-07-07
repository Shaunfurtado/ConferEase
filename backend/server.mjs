//backend\server.mjs
import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import sessionRoutes from './routes/sessions.mjs'; 
import Redis from 'ioredis';

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
const redisSub = new Redis(); // Separate instance for subscribing to Redis channels

// Store sessions and their participants
const sessions = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', async () => {
        console.log('Client disconnected');
        for (const sessionId in sessions) {
            sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
            if (sessions[sessionId].length === 0) {
                delete sessions[sessionId];
            } else {
                // Remove nickname from Redis and update clients
                await redis.del(`session:${sessionId}:nickname:${socket.id}`);
                const clients = await getSessionClients(sessionId);
                io.to(sessionId).emit('client-update', clients);
                io.to(sessionId).emit('notification', `${socket.id} has disconnected.`);
            }
        }
    });

    socket.on('join-session', async ({ sessionId, clientId, nickname }) => {
        try {
            const clientSocketId = socket.id;

            if (!sessions[sessionId]) {
                sessions[sessionId] = [];
            }
            sessions[sessionId].push(clientSocketId);
            socket.join(sessionId);

            // Store nickname in Redis
            await redis.set(`session:${sessionId}:nickname:${clientSocketId}`, nickname);
            // Save the nickname as the creatorId when the first client joins
            if (sessions[sessionId].length === 1) {
                await Promise.all([
                    redis.set(`session:${sessionId}:creatorId`, clientSocketId),
                    pocketbase.set(`session:${sessionId}:creatorId`, clientSocketId)
                ]);
            }

            // Subscribe to Redis channel for the session
            redisSub.subscribe(sessionId);

            // Send updated client list to all clients
            const clients = await getSessionClients(sessionId);
            io.to(sessionId).emit('client-update', clients);
            io.to(sessionId).emit('notification', `${nickname} has joined the session.`);
        } catch (error) {
            console.error('Error joining session:', error);
        }
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
    try {
        const creatorId = await redis.get(`session:${sessionId}:creatorId`);
        const creatorNickname = await redis.get(`session:${sessionId}:nickname:${creatorId}`);
        
        if (creatorId === userId) {
            io.to(sessionId).emit('end-call', { sessionId, userId, creatorNickname });
            redis.publish(sessionId, JSON.stringify({ type: 'end-call' }));
            delete sessions[sessionId];
            // Remove all nicknames from Redis
            const keys = await redis.keys(`session:${sessionId}:nickname:*`);
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Error ending call:', error);
    }
});

    // Handle leave call by client
    socket.on('leave-call', async ({ sessionId }) => {
        try {
            socket.leave(sessionId);
            sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
            // Remove nickname from Redis
            await redis.del(`session:${sessionId}:nickname:${socket.id}`);
            // Update client list
            const clients = await getSessionClients(sessionId);
            io.to(sessionId).emit('client-update', clients);
            io.to(sessionId).emit('notification', `${socket.id} has left the call.`);
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
            id,
            nickname: nick || id
        };
    }));
    return clients;
};

// Handle Redis messages
redisSub.on('message', (channel, message) => {
    const parsedMessage = JSON.parse(message);
    io.to(channel).emit(parsedMessage.type, parsedMessage);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));