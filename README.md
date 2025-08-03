# Tippay: SaaS Tipping Service for Live Streamers in India

Tippay is a Software as a Service (SaaS) platform that enables live streamers in India to receive tips via UPI payments (using Razorpay). It includes features like automatic commission splitting (you keep 5% per tip), real-time overlays in OBS Studio via Streamlabs alerts, and secure user management. Tips are processed securely, with the remainder transferred directly to the streamer's bank account.

This project is built with:
- **Backend**: Node.js, Express, MongoDB (for user data), Razorpay (for payments and Route for splits), Streamlabs API (for alerts).
- **Frontend**: React.js for user interfaces (signup, login, dashboard, tipping pages).

## Features
- **User Signup & Onboarding**: Streamers sign up with email, password, and bank details (for Razorpay Route linked accounts).
- **Tipping Page**: Each streamer gets a unique public page (e.g., /tip/username) where viewers can tip via UPI, cards, etc.
- **Commission Model**: Platform takes 5% commission per tip; rest auto-transfers to streamer's bank.
- **Real-Time Alerts**: On successful tip, triggers a donation alert in Streamlabs, which shows as an overlay in OBS.
- **Security**: Hashed passwords (bcrypt), JWT authentication, webhook handling for payments.

## Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (free tier)
- Razorpay account (test mode for development; enable Route)
- Streamlabs account (for API token)
- GitHub repo (for deployment)

## Installation (Local Development)
1. Clone the repo:
   ```
   git clone https://github.com/yourusername/tippay.git
   cd tippay
   ```
2. Install backend dependencies:
   ```
   npm install
   ```
3. Create `.env` in root with:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   RAZORPAY_KEY_ID=your_razorpay_test_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
   JWT_SECRET=your_jwt_secret
   ```
4. Install frontend dependencies:
   ```
   cd client
   npm install
   cd ..
   ```
5. Run backend:
   ```
   node server.js
   ```
6. Run frontend (new terminal):
   ```
   cd client
   npm start
   ```
7. Access at http://localhost:3000 (signup at /signup, etc.).

## Deployment (e.g., on Proxmox/Ubuntu VPS)
1. Clone repo on server.
2. Install Node.js, PM2, Nginx (see setup guides in conversation history).
3. Set up .env as above.
4. Run backend with PM2: `pm2 start server.js --name "tippay"`.
5. Build frontend: `cd client && npm run build`.
6. Serve via Nginx (config in history).
7. Add HTTPS with Certbot.
8. Set Razorpay webhook to https://yourdomain.com/api/webhook (event: payment.captured).

## Usage
- **For Streamers**:
  1. Sign up at /signup (provide test bank details for dev).
  2. Login at /login.
  3. Add Streamlabs API token in dashboard.
  4. Share your tipping link: yourdomain.com/tip/your_username.
- **For Viewers**: Visit tipping page, enter amount/name, pay via UPI.
- **OBS Setup**: Add Streamlabs Alert Box as Browser source in OBS.

## Testing
- Use Razorpay test mode (success@razorpay for UPI).
- Test tip: Should split commission, transfer, and trigger alert.

## Contributing
Fork the repo, make changes, submit PR.

## License
MIT License (feel free to use/modify).

For issues, check conversation history or open a GitHub issue. Built with ❤️ for Indian streamers!
