const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const queueRoutes = require('./routes/queueRoutes'); // Import the queueRoutes configuration

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
app.use('/api/opd', require('./routes/opdRoutes'));
app.use('/api/opds', require('./routes/opdRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/tokens', require('./routes/tokenRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));

// Hiba - Caregiver Links
app.use('/api/links', require('./routes/caregiverLinkRoutes'));
app.use('/api/admin/links', require('./routes/adminLinkRoutes'));
app.use('/api/users', require('./routes/profileRoutes'));
app.use('/api/waiting-areas', require('./routes/waitingAreaRoutes'));
app.use('/api/admin/users', require('./routes/adminUserRoutes'));

// Chamupathi Routes 
app.use('/api/queue', queueRoutes);
app.use('/api/consultations', require('./routes/consultationRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));


// app.use('/api/notifications', require('./routes/notificationRoutes'));
// app.use('/api/alert-preferences', require('./routes/alertPreferenceRoutes'));
// app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/track', require('./routes/trackRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
// app.use('/api/notification-logs', require('./routes/notificationLogRoutes'));

app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin/notifications', require('./routes/Adminnotificationroutes'));
app.use('/api/admin/alert-preferences', require('./routes/adminAlertPreferenceRoutes'));
app.use('/api/notification-logs', require('./routes/notificationLogRoutes'));
app.use('/api/alert-preferences', require('./routes/alertPreferenceRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));

app.use('/api/admin/tokens', require('./routes/adminTokenRoutes'));


app.get('/', (req, res) => {
  res.send('MediQueue Server Running...');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: "Backend is running!" });
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



//Patient Login
  // "email": "minuri@gmail.com",
  // "password": "minuri123"

//Admin Login
  // email": "admin@mediq.lk"
  // password": "Admin123!"

//Caregiver Login
  //"email": "caregiver@gmail.lk",
  //"password": "care123"