const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Normalize an accidentally repeated API prefix before route matching.
app.use((req, res, next) => {
  req.url = req.url.replace(/^\/api\/api(?=\/|\?|$)/i, '/api');
  next();
});

// GET and HEAD requests do not use request bodies, so ignore stale client payloads.
const jsonParser = express.json({
  strict: false,
  type: ['application/json', 'text/plain'],
});
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.body = {};
    return next();
  }

  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      const parsedBody = JSON.parse(req.body);
      if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
        req.body = parsedBody;
      }
    } catch {
      // Leave non-object strings for route validation to reject.
    }
  }

  if (req.body === null || typeof req.body === 'undefined') {
    req.body = {};
  }

  next();
});
app.use(express.urlencoded({ extended: false }));

// Basic status check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI FAQ Assistant API is running.',
    version: '1.0.0',
  });
});

// Register API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/faqs', require('./routes/faqRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Handle Socket.IO polling requests gracefully (if client attempts WebSocket connection)
app.use('/socket.io', (req, res) => {
  res.status(404).json({ error: 'Socket.IO not enabled' });
});

// 404 Route handler for unmatched routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
