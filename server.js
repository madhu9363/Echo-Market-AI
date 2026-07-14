import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

// Configurations and database
dotenv.config();
import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Middlewares
import { errorHandler } from './middleware/errorMiddleware.js';
import { protect } from './middleware/authMiddleware.js';
import Notification from './models/Notification.js';

// Initialize DB Connection
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io Server Setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

// Map to track connected client sockets by User ID
const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log(`Socket Client Connected: ${socket.id}`);

  // Register user socket mapping
  socket.on('register', (userId) => {
    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`Registered user socket for ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Clean up mapping on exit
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`De-registered user socket for ${userId}`);
        break;
      }
    }
    console.log(`Socket Client Disconnected: ${socket.id}`);
  });
});

// Expose Socket.io to routers by attaching helper to express app
app.set('io', io);
app.set('userSocketMap', userSocketMap);

// Global socket broadcast helper function
export const sendRealtimeNotification = (userId, notificationData) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('new_notification', notificationData);
  }
};

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for dev localhost asset serving
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 1000, // max queries
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Create static asset folders if they do not exist
const uploadsFolder = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}
// Serve static uploads
app.use('/uploads', express.static(uploadsFolder));

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);

// Custom Notifications Endpoint in entrypoint for simple delivery
app.get('/api/notifications', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
});

app.put('/api/notifications/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Root endpoint for browser access
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Echo Market AI backend is running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Central Error Middleware Hook
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Echo Market AI Backend Server is running in ${process.env.NODE_ENV} mode on PORT ${PORT}`);
});
