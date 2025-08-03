require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Razorpay = require('razorpay');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  razorpayAccountId: String,
  bankDetails: Object, // {account_number, ifsc, beneficiary_name}
  streamlabsToken: String
});
const User = mongoose.model('User', UserSchema);

// Signup route
app.post('/api/signup', async (req, res) => {
  const { username, email, password, bankDetails } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create linked account in Razorpay Route
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
        pan: bankDetails.pan || 'TESTPAN1234', // Add real KYC fields in production
        gst: bankDetails.gst || ''
      },
      bank_account: {
        beneficiary_name: bankDetails.beneficiary_name,
        account_number: bankDetails.account_number,
        ifsc: bankDetails.ifsc
      }
    });
    const user = new User({ username, email, password: hashedPassword, razorpayAccountId: linkedAccount.id, bankDetails });
    await user.save();
    res.json({ message: 'Signup successful', userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user });
});

// Add Streamlabs token (authenticated)
app.post('/api/add-token', authenticateToken, async (req, res) => {
  const { streamlabsToken } = req.body;
  await User.findByIdAndUpdate(req.user.userId, { streamlabsToken });
  res.json({ message: 'Token added' });
});

// Create tip order
app.post('/api/create-order/:username', async (req, res) => {
  const { amount, donorName } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'Streamer not found' });
  try {
    const order = await rzp.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `tip_${Date.now()}`,
      notes: { donor: donorName, streamerId: user._id.toString() }
    });
    res.json({ orderId: order.id, key: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for payment success
app.post('/api/webhook', async (req, res) => {
  // In production, verify signature using Razorpay SDK
  const payload = req.body;
  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const order = payload.payload.order.entity;
    const amount = payment.amount / 100;
    const donor = order.notes.donor;
    const streamerId = order.notes.streamerId;
    const streamer = await User.findById(streamerId);

    // Commission split (5%)
    const commission = amount * 0.05;
    const transferAmount = amount - commission;

    // Create transfer via Route
    await rzp.transfers.create({
      account: streamer.razorpayAccountId,
      amount: transferAmount * 100,
      currency: 'INR',
      on_hold: false
    });

    // Trigger Streamlabs alert
    if (streamer.streamlabsToken) {
      await axios.post('https://streamlabs.com/api/v2.0/donations', {
        name: donor || 'Anonymous',
        message: `Tipped ₹${amount}! Thank you!`,
        amount: amount,
        currency: 'INR',
        created_at: new Date().toISOString(),
        identifier: `tip_${Date.now()}`
      }, {
        headers: { Authorization: `Bearer ${streamer.streamlabsToken}` }
      });
    }

    console.log(`Tip processed: ₹${amount}, Commission: ₹${commission}`);
  }
  res.status(200).end();
});

// Middleware for auth
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.listen(port, () => console.log(`Backend running on port ${port}`));