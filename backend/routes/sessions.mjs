// backend\routes\sessions.mjs
import express from 'express';
import PocketBase from 'pocketbase';
import Redis from 'ioredis';

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
    const { nickname, userId, sessionType } = req.body;
    if (!nickname || !userId || !sessionType) {
        return res.status(400).json({ error: 'Nickname, user ID, and session type are required' });
    }
    try {
        await authenticateAdmin();
        
        const record = await pb.collection('sessions').create({
            nickname,
            userId,
            sessionType,
            status: 'active',
            creatorId: userId
        });

        await redis.set(`session:${record.id}:nickname:${userId}`, nickname);
        await redis.set(`session:${record.id}:type`, sessionType);
        await redis.set(`session:${record.id}:status`, 'active');
        await redis.set(`session:${record.id}:creatorId`, userId);

        await redis.sadd(`session:${record.id}:clients`, userId);

        res.status(201).json({ sessionId: record.id });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        await authenticateAdmin();
        const record = await pb.collection('sessions').getOne(sessionId);
        const sessionType = await redis.get(`session:${sessionId}:type`);
        const status = await redis.get(`session:${sessionId}:status`);
        
        if (record.status !== status) {
            // Update PocketBase if there's a mismatch
            await pb.collection('sessions').update(sessionId, { status });
        }
        
        res.status(200).json({ ...record, sessionType, status });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:sessionId/status', async (req, res) => {
    const { sessionId } = req.params;
    try {
        await authenticateAdmin();

        const record = await pb.collection('sessions').getOne(sessionId);
        const redisStatus = await redis.get(`session:${sessionId}:status`);
        
        // Use Redis status if available, otherwise use PocketBase status
        const status = redisStatus || record.status;
        
        // Update PocketBase if there's a mismatch
        if (record.status !== status) {
            await pb.collection('sessions').update(sessionId, { status });
        }
        
        res.json({ status });
    } catch (error) {
        console.error('Error fetching session status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/:sessionId/join', async (req, res) => {
    const { sessionId } = req.params;
    const { userId, nickname } = req.body;
    
    if (!userId || !nickname) {
        return res.status(400).json({ error: 'User ID and nickname are required' });
    }

    try {
        await authenticateAdmin();
        
        const sessionExists = await redis.exists(`session:${sessionId}`);
        if (!sessionExists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const clientCount = await redis.scard(`session:${sessionId}:clients`);
        const sessionType = await redis.get(`session:${sessionId}:type`);

        if (sessionType === '1to1' && clientCount >= 2) {
            return res.status(400).json({ error: 'This session is full' });
        }

        // Check if creatorId is already set
        const creatorId = await redis.get(`session:${sessionId}:creatorId`);
        if (!creatorId) {
            // Set creatorId to the first client who joins
            await redis.set(`session:${sessionId}:creatorId`, userId);
        }

        // Add the user to the session's client list
        await redis.sadd(`session:${sessionId}:clients`, userId);
        await redis.set(`session:${sessionId}:nickname:${userId}`, nickname);

        res.status(200).json({ 
            message: 'Joined session successfully', 
            creatorId: creatorId || userId,
            sessionType
        });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/:sessionId/expire', async (req, res) => {
    const { sessionId } = req.params;
    try {
        await authenticateAdmin();

        await redis.set(`session:${sessionId}:status`, 'expired');
        await pb.collection('sessions').update(sessionId, { status: 'expired' });

        res.json({ message: 'Session expired successfully' });
    } catch (error) {
        console.error('Error expiring session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;