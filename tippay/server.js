require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Razorpay = require('razorpay');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Enhanced User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  razorpayAccountId: String,
  bankDetails: {
    beneficiary_name: String,
    account_number: String,
    ifsc: String
  },
  streamlabsToken: String,
  overlaySettings: {
    theme: { type: String, default: 'default' },
    showAmount: { type: Boolean, default: true },
    showMessage: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    minTipAmount: { type: Number, default: 10 },
    maxTipAmount: { type: Number, default: 10000 },
    animationDuration: { type: Number, default: 5000 }
  },
  isActive: { type: Boolean, default: true },
  totalEarnings: { type: Number, default: 0 },
  tipCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Tip Schema for analytics
const TipSchema = new mongoose.Schema({
  streamerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donorName: { type: String, default: 'Anonymous' },
  amount: { type: Number, required: true },
  message: { type: String, maxlength: 200 },
  paymentId: String,
  orderId: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  commission: Number,
  transferAmount: Number,
  createdAt: { type: Date, default: Date.now }
});

const Tip = mongoose.model('Tip', TipSchema);

// Socket.io connection handling
const activeStreamers = new Map(); // streamer_id -> socket_id

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Streamer joins their room for overlay updates
  socket.on('join_streamer_room', (streamerId) => {
    socket.join(`streamer_${streamerId}`);
    activeStreamers.set(streamerId, socket.id);
    console.log(`Streamer ${streamerId} joined room`);
  });

  // Handle overlay configuration updates
  socket.on('update_overlay_config', async (data) => {
    try {
      const { streamerId, config } = data;
      await User.findByIdAndUpdate(streamerId, { 
        overlaySettings: config,
        lastActive: new Date()
      });
      
      // Broadcast to overlay
      io.to(`streamer_${streamerId}`).emit('overlay_config_updated', config);
    } catch (error) {
      socket.emit('error', { message: 'Failed to update overlay config' });
    }
  });

  socket.on('disconnect', () => {
    // Remove from active streamers
    for (const [streamerId, socketId] of activeStreamers.entries()) {
      if (socketId === socket.id) {
        activeStreamers.delete(streamerId);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Enhanced signup route
app.post('/api/signup', async (req, res) => {
  const { username, email, password, bankDetails } = req.body;
  
  try {
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create linked account in Razorpay Route (simplified for MVP)
    let razorpayAccountId = null;
    try {
      const linkedAccount = await rzp.accounts.create({
        type: 'route',
        email,
        legal_business_name: username,
        customer_facing_business_name: username,
        contact_name: username,
        profile: {
          category: 'entertainment',
          subcategory: 'streaming'
        },
        legal_info: {
          pan: 'AAACL1234C' // Use test PAN for development
        },
        bank_account: bankDetails
      });
      razorpayAccountId = linkedAccount.id;
    } catch (rzpError) {
      console.error('Razorpay account creation failed:', rzpError);
      // Continue without Razorpay account for now
    }

    const user = new User({ 
      username, 
      email, 
      password: hashedPassword, 
      razorpayAccountId,
      bankDetails 
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: 'Signup successful', 
      userId: user._id,
      username: user.username
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        overlaySettings: user.overlaySettings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user data (authenticated)
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent tips for dashboard
    const recentTips = await Tip.find({ streamerId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      ...user.toObject(),
      recentTips
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update overlay settings
app.post('/api/overlay-settings', authenticateToken, async (req, res) => {
  try {
    const { overlaySettings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { overlaySettings, lastActive: new Date() },
      { new: true }
    );

    // Notify overlay of changes
    io.to(`streamer_${req.user.userId}`).emit('overlay_config_updated', overlaySettings);
    
    res.json({ message: 'Overlay settings updated', overlaySettings: user.overlaySettings });
  } catch (error) {
    console.error('Update overlay settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get overlay settings (public endpoint for OBS)
app.get('/api/overlay/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'Streamer not found' });
    }
    
    res.json({
      streamerId: user._id,
      username: user.username,
      overlaySettings: user.overlaySettings
    });
  } catch (error) {
    console.error('Get overlay error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced create tip order
app.post('/api/create-order/:username', async (req, res) => {
  const { amount, donorName, message } = req.body;
  
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    // Validate tip amount
    const tipAmount = parseFloat(amount);
    if (tipAmount < user.overlaySettings.minTipAmount || 
        tipAmount > user.overlaySettings.maxTipAmount) {
      return res.status(400).json({ 
        error: `Tip amount must be between ₹${user.overlaySettings.minTipAmount} and ₹${user.overlaySettings.maxTipAmount}` 
      });
    }

    const order = await rzp.orders.create({
      amount: tipAmount * 100,
      currency: 'INR',
      receipt: `tip_${Date.now()}`,
      notes: { 
        donor: donorName || 'Anonymous',
        message: message || '',
        streamerId: user._id.toString(),
        streamerUsername: user.username
      }
    });

    // Create tip record
    const tip = new Tip({
      streamerId: user._id,
      donorName: donorName || 'Anonymous',
      amount: tipAmount,
      message: message || '',
      orderId: order.id,
      status: 'pending'
    });
    await tip.save();

    res.json({ 
      orderId: order.id, 
      key: process.env.RAZORPAY_KEY_ID,
      amount: tipAmount,
      streamerName: user.username
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced webhook for payment success
app.post('/api/webhook', async (req, res) => {
  try {
    const payload = req.body;
    
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const order = payload.payload.order.entity;
      
      const amount = payment.amount / 100;
      const donor = order.notes.donor || 'Anonymous';
      const message = order.notes.message || '';
      const streamerId = order.notes.streamerId;
      const streamerUsername = order.notes.streamerUsername;

      // Update tip record
      const tip = await Tip.findOneAndUpdate(
        { orderId: order.id },
        { 
          paymentId: payment.id,
          status: 'completed',
          commission: amount * 0.05,
          transferAmount: amount * 0.95
        },
        { new: true }
      );

      if (!tip) {
        console.error('Tip record not found for order:', order.id);
        return res.status(404).json({ error: 'Tip record not found' });
      }

      // Update user stats
      await User.findByIdAndUpdate(streamerId, {
        $inc: { 
          totalEarnings: amount * 0.95,
          tipCount: 1
        }
      });

      // Real-time notification to overlay
      const tipData = {
        id: tip._id,
        donor,
        amount,
        message,
        timestamp: new Date(),
        paymentId: payment.id
      };

      io.to(`streamer_${streamerId}`).emit('new_tip', tipData);

      // Handle commission split and transfer (simplified)
      try {
        const streamer = await User.findById(streamerId);
        if (streamer && streamer.razorpayAccountId) {
          const transferAmount = Math.floor(amount * 0.95 * 100); // Convert to paise
          
          await rzp.transfers.create({
            account: streamer.razorpayAccountId,
            amount: transferAmount,
            currency: 'INR',
            on_hold: false
          });
        }
      } catch (transferError) {
        console.error('Transfer failed:', transferError);
        // Continue even if transfer fails
      }

      // Trigger Streamlabs alert (if configured)
      try {
        const streamer = await User.findById(streamerId);
        if (streamer && streamer.streamlabsToken) {
          await axios.post('https://streamlabs.com/api/v2.0/donations', {
            name: donor,
            message: message || `Tipped ₹${amount}! Thank you for your support!`,
            amount: amount,
            currency: 'INR',
            created_at: new Date().toISOString(),
            identifier: `tip_${Date.now()}`
          }, {
            headers: { Authorization: `Bearer ${streamer.streamlabsToken}` }
          });
        }
      } catch (alertError) {
        console.error('Streamlabs alert failed:', alertError);
      }

      console.log(`✅ Tip processed: ${donor} → ${streamerUsername} ₹${amount}`);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
  
  res.status(200).json({ status: 'success' });
});

// Analytics endpoint
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const streamerId = req.user.userId;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const tips = await Tip.find({ 
      streamerId, 
      status: 'completed',
      ...dateFilter 
    }).sort({ createdAt: -1 });

    const analytics = {
      totalTips: tips.length,
      totalAmount: tips.reduce((sum, tip) => sum + tip.amount, 0),
      totalEarnings: tips.reduce((sum, tip) => sum + tip.transferAmount, 0),
      averageTip: tips.length > 0 ? tips.reduce((sum, tip) => sum + tip.amount, 0) / tips.length : 0,
      topTippers: tips.reduce((acc, tip) => {
        acc[tip.donorName] = (acc[tip.donorName] || 0) + tip.amount;
        return acc;
      }, {}),
      dailyBreakdown: tips.reduce((acc, tip) => {
        const date = tip.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + tip.amount;
        return acc;
      }, {})
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Streamlabs token (authenticated)
app.post('/api/add-token', authenticateToken, async (req, res) => {
  const { streamlabsToken } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.userId, { 
      streamlabsToken,
      lastActive: new Date()
    });
    res.json({ message: 'Token added successfully' });
  } catch (error) {
    console.error('Add token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware for authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(port, () => {
  console.log(`🚀 Tippay server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});