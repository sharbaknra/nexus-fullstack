const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/documents', require('./routes/documents'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => res.json({ message: 'Nexus API running' }));

// WebRTC signaling
const rooms = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.data.userId = userId;
    socket.data.userName = userName;
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId, userName });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });

    // Send existing participants to the new user
    const others = rooms[roomId].filter(p => p.socketId !== socket.id);
    socket.emit('existing-participants', others);
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('toggle-media', ({ roomId, audio, video }) => {
    socket.to(roomId).emit('peer-media-toggle', { socketId: socket.id, audio, video });
  });

  socket.on('leave-room', ({ roomId }) => {
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(p => p.socketId !== socket.id);
    }
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit('user-left', { socketId: socket.id });
      rooms[roomId] = rooms[roomId].filter(p => p.socketId !== socket.id);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
