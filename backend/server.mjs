// backend\server.mjs
import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import sessionRoutes from './routes/sessions.mjs'; 
import Redis from 'ioredis';
import PocketBase from 'pocketbase';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes);

const server = http.createServer(app);
const io = new SocketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const redis = new Redis();
const redisSub = new Redis(); // Separate instance for subscribing to Redis channels

const pb = new PocketBase('http://127.0.0.1:8090');
const adminEmail = 'shaunfurtado49@gmail.com';
const adminPassword = 'Yamaharmax12';
pb.autoCancellation(false); // Disable auto-cancellation
pb.timeout = 30000; // Set timeout to 30 seconds (adjust as needed)

async function authenticateAdmin() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
    } catch (error) {
        console.error('Error authenticating admin:', error);
        throw new Error('Authentication failed');
    }
}

async function authenticateAdminWithRetry(maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await pb.admins.authWithPassword(adminEmail, adminPassword);
            console.log('Admin authenticated successfully');
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error('Error authenticating admin after retries:', error);
                throw new Error('Authentication failed after multiple attempts');
            }
            console.warn(`Authentication attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Store sessions and their participants
const sessions = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', async () => {
        console.log('Client disconnected');
        for (const sessionId in sessions) {
            sessions[sessionId] = sessions[sessionId].filter(id => id !== socket.id);
            if (sessions[sessionId].length === 0) {
                await redis.del(`session:${sessionId}:nickname:${socket.id}`);
                const clients = await getSessionClients(sessionId);
                io.to(sessionId).emit('client-update', clients);
                io.to(sessionId).emit('notification', `${socket.id} has disconnected.`);
            }
        }
    });

    socket.on('join-session', async ({ sessionId, clientId, nickname }, callback) => {
        console.log(`Attempting to join session: ${sessionId}, clientId: ${clientId}, nickname: ${nickname}`);
        try {
            await authenticateAdminWithRetry();
            console.log('Authentication successful, proceeding with join process');
            const record = await pb.collection('sessions').getOne(sessionId);
            
            let status = await redis.get(`session:${sessionId}:status`);
            if (!status) {
                status = record.status;
                await redis.set(`session:${sessionId}:status`, status);
            }
    
            if (status === 'expired') {
                callback({ success: false, message: 'This session has expired' });
                return;
            }
    
            const clientCount = await redis.scard(`session:${sessionId}:clients`);
            
            if (record.sessionType === '1to1' && clientCount >= 2) {
                callback({ success: false, message: 'This session is full' });
                return;
            }
            
            await redis.sadd(`session:${sessionId}:clients`, clientId);
            await redis.set(`session:${sessionId}:nickname:${clientId}`, nickname);
            
            socket.join(sessionId);
            
            const creatorId = await redis.get(`session:${sessionId}:creatorId`);
            if (!creatorId) {
                await redis.set(`session:${sessionId}:creatorId`, clientId);
                await pb.collection('sessions').update(sessionId, { creatorId: clientId });
                socket.emit('creator-set', clientId);
            }

            const isCreator = creatorId === clientId;
            
            const clients = await getSessionClients(sessionId);
            io.to(sessionId).emit('client-update', clients);
            io.to(sessionId).emit('notification', `${nickname} has joined the session.`);
    
            console.log(`Successfully joined session: ${sessionId}`);
            callback({ success: true, isCreator });
        } catch (error) {
            console.error('Error joining session:', error);
            callback({ success: false, message: 'Error joining session' });
        }
    });




    socket.on('expire-session', async ({ sessionId }) => {
        try {
            await authenticateAdmin();
            await redis.set(`session:${sessionId}:status`, 'expired');
            await pb.collection('sessions').update(sessionId, { status: 'expired' });
            io.to(sessionId).emit('session-status', 'expired');
        } catch (error) {
            console.error('Error expiring session:', error);
        }
    });

    socket.on('join-success', (data) => {
        console.log('Successfully joined session:', data);
        // setState(data);
    });

    // Handle signaling data
    socket.on('offer', (data) => {
        const { sessionId, offer } = data;
        console.log('Forwarding offer', sessionId, offer);
        socket.to(sessionId).emit('offer', offer);
    });
    
    socket.on('answer', (data) => {
        const { sessionId, answer } = data;
        console.log('Forwarding answer', sessionId, answer);
        socket.to(sessionId).emit('answer', answer);
    });
    
    socket.on('ice-candidate', (data) => {
        const { sessionId, candidate } = data;
        console.log('Forwarding ICE candidate', sessionId, candidate);
        socket.to(sessionId).emit('ice-candidate', candidate);
    });
    

    // Handle chat messages
    socket.on('chat-message', async (data) => {
        const { sessionId, sender, message } = data;
        io.to(sessionId).emit('chat-message', { sender, message });
        await redis.rpush(`session:${sessionId}:messages`, JSON.stringify({ sender, message }));
    });

    // Handle end call by admin
    socket.on('end-call', async ({ sessionId, userId }) => {
        try {
            await authenticateAdmin();
            const creatorId = await redis.get(`session:${sessionId}:creatorId`);
            const creatorNickname = await redis.get(`session:${sessionId}:nickname:${creatorId}`);
            
            if (creatorId === userId) {
                await redis.set(`session:${sessionId}:status`, 'expired');
                await pb.collection('sessions').update(sessionId, { status: 'expired' });
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
    const clientIds = await redis.smembers(`session:${sessionId}:clients`);
    const clients = await Promise.all(clientIds.map(async id => {
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
