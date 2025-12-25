const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration for development and production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
      /\.onrender\.com$/ // Allow all Render.com subdomains
    ].filter(Boolean); // Remove undefined values

    if (!origin || allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (you can restrict later)
    }
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));

// Parse JSON for all requests (including POST /generate-pdf which receives JSON)
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leases', require('./routes/leases'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/ocr', require('./routes/ocr'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server - MUST listen on 0.0.0.0 for Fly.io
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Listening on 0.0.0.0:${PORT}`);
  if (process.env.BYPASS_DB === 'true') {
    console.log(`⚠️  Database bypass mode: ENABLED (no database required)`);
    console.log(`   You can login/register with any credentials`);
  }
});

module.exports = app;

