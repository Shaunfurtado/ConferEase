const mediasoup = require('mediasoup');
const express = require('express');
const http = require('http');
const io = require('socket.io');

const app = express();
const server = http.createServer(app);
const socketServer = io(server);

let worker;
let rooms = {}; // Track rooms and routers

const startWorker = async () => {
  worker = await mediasoup.createWorker();
  console.log('Worker started');

  worker.on('died', () => {
    console.error('Worker died, restarting...');
    setTimeout(startWorker, 1000); // Restart the worker
  });
};

const createRoom = async (roomName) => {
  const router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
      },
    ],
  });
  rooms[roomName] = { router };
};

socketServer.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-conference', async (roomName) => {
    if (!rooms[roomName]) {
      await createRoom(roomName);
    }
    const { router } = rooms[roomName];
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: 'your_public_ip' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    socket.emit('conference-joined', {
      transportParams: transport,
    });

    socket.on('produce', async ({ kind, rtpParameters }) => {
      const producer = await transport.produce({ kind, rtpParameters });
      rooms[roomName].producers.push(producer);

      socket.broadcast.to(roomName).emit('new-producer', {
        producerId: producer.id,
        userId: socket.id,
      });
    });

    socket.on('consume', async ({ producerId }) => {
      const consumer = await transport.consume({ producerId });
      socket.emit('consumer-created', { consumer });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

startWorker();
server.listen(3000, () => {
  console.log('MediaSoup server running on port 3000');
});
