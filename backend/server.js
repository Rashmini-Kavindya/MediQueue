const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');

// Database Connection
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time Queue Updates
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Pass Socket instance to request object (Routes වලදී real-time updates යවන්න)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes 
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/opds', require('./routes/opdRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/tokens', require('./routes/tokenRoutes'));

// Hiba - Caregiver Links
app.use('/api/links', require('./routes/caregiverLinkRoutes'));
app.use('/api/admin/links', require('./routes/adminLinkRoutes'));
app.use('/api/users', require('./routes/profileRoutes'));

app.get('/', (req, res) => {
  res.send('MediQueue Server Running...');
});

// Socket.io Listener
io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔥 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});