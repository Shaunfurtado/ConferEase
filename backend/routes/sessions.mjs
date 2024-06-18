// backend\routes\sessions.mjs

import express from 'express';
import PocketBase from 'pocketbase';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

const router = express.Router();
const pb = new PocketBase('http://127.0.0.1:8090');
const redis = new Redis(); // Default settings

// Admin credentials
const adminEmail = 'shaunfurtado49@gmail.com';
const adminPassword = 'Yamaharmax12';

// Authenticate admin
async function authenticateAdmin() {
    try {
        const authData = await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('Admin authenticated successfully');
    } catch (error) {
        console.error('Error authenticating admin:', error);
        throw new Error('Authentication failed');
    }
}

router.post('/create-session', async (req, res) => {
    const { nickname, userId } = req.body;
    if (!nickname || !userId) {
        return res.status(400).json({ error: 'Nickname and user ID are required' });
    }
    try {
        await authenticateAdmin();

        // Generate clientId in the desired format
        const clientId = uuidv4();
        console.log(`Generated clientId: ${clientId}`);

        // Create session record in PocketBase
        const record = await pb.collection('sessions').create({ nickname, userId });

        // Save nickname in Redis
        await redis.set(`session:${record.id}:nickname:${userId}`, nickname);

        res.status(201).json({ sessionId: record.id, clientId }); // Return clientId to frontend
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/join-session', async (req, res) => {
    const { sessionId, userId, nickname, clientId } = req.body;
    if (!sessionId || !userId || !nickname || !clientId) {
        return res.status(400).json({ error: 'Session ID, User ID, Nickname, and Client ID are required' });
    }
    try {
        await authenticateAdmin();

        // Check if creatorId exists in Redis
        let creatorId = await redis.get(`session:${sessionId}:creatorId`);
        if (!creatorId) {
            // If creatorId does not exist, set it to the current user
            await redis.set(`session:${sessionId}:creatorId`, clientId);
            creatorId = clientId;
        }

        // Save nickname in Redis
        await redis.set(`session:${sessionId}:nickname:${userId}`, nickname);

        res.status(200).json({ creatorId, clientId }); // Return clientId and creatorId to frontend
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/end-call', async (req, res) => {
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) {
        return res.status(400).json({ error: 'Session ID and User ID are required' });
    }
    try {
        await authenticateAdmin();

        // Fetch creatorId from Redis
        const creatorId = await redis.get(`session:${sessionId}:creatorId`);
        
        if (creatorId === userId) {
            io.to(sessionId).emit('end-call');
            delete sessions[sessionId];

            // Delete all associated session data in Redis
            const keys = await redis.keys(`session:${sessionId}:nickname:*`);
            await redis.del(...keys);
            await redis.del(`session:${sessionId}:creatorId`);

            console.log(`Call ended for session ${sessionId} by creator ${creatorId}.`);
            res.status(200).json({ message: `Call ended for session ${sessionId} by creator ${creatorId}.` });
        } else {
            console.log(`User ${userId} is not the creator of session ${sessionId}. End call denied.`);
            res.status(403).json({ error: `User ${userId} is not the creator of session ${sessionId}. End call denied.` });
        }
    } catch (error) {
        console.error('Error ending call:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
