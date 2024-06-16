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
    const { nickname, userId } = req.body;
    if (!nickname || !userId) {
        return res.status(400).json({ error: 'Nickname and user ID are required' });
    }
    try {
        await authenticateAdmin();
        const record = await pb.collection('sessions').create({ nickname, userId });
        
        // Save creator ID in Redis
        await redis.set(`session:${record.id}:creatorId`, userId);

        res.status(201).json({ sessionId: record.id });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const record = await pb.collection('sessions').getOne(sessionId);
        res.status(200).json(record);
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
