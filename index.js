import express from 'express';
import 'dotenv/config';
import Bynder from '@bynder/bynder-js-sdk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs-extra';

// Get current file's directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
// import productRoutes from './routes/productRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import routesRoutes from './routes/routesRoutes.js';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'output');
fs.ensureDirSync(uploadsDir);

// Import response utilities
import { notFoundHandler, errorHandler } from './utils/responseUtils.js';

// Initialize Bynder SDK with environment variables
// Initialize Bynder SDK with ES6 destructuring and object shortcuts
const {
  BYNDER_BASE_URL = "https://portal.getbynder.com/api/",
  BYNDER_CLIENT_ID: clientId,
  BYNDER_CLIENT_SECRET: clientSecret,
  BYNDER_REDIRECT_URI: redirectUri,
  PORT = 3000
} = process.env;

// Initialize Bynder SDK
const bynder = new Bynder({
    baseURL: BYNDER_BASE_URL,
    clientId,
    clientSecret,
    redirectUri
});

// Try to log in using client credentials if available
if (clientId && clientSecret) {
  console.log('Attempting to authenticate with Bynder using client credentials...');
  bynder.getTokenClientCredentials()
    .then(() => {
      console.log('✅ Successfully authenticated with Bynder');
    })
    .catch(error => {
      console.error('❌ Failed to authenticate with Bynder:', error.message);
      console.log('API calls to Bynder will likely fail. Please check your credentials.');
    });
}

const app = express();

// Make Bynder instance available to routes
app.locals.bynder = bynder;

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to parse JSON bodies with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));

// Middleware to parse URL-encoded bodies with increased limits
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple request logging middleware with ES6 arrow function
app.use((req, res, next) => {
  const { method, url } = req;
  console.log(`${new Date().toISOString()} - ${method} ${url}`);
  next();
});

// CORS middleware with ES6 object destructuring for headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

app.use((req, res, next) => {
  Object.entries(CORS_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  next();
});

// Basic route with ES6 enhanced object literals
app.get('/', (req, res) => {
  const success = true;
  const message = 'API is running';
  const version = '1.0.0';
  const timestamp = new Date().toISOString();
  
  // Using object property shorthand
  res.json({
    success,
    message,
    version,
    timestamp
  });
});

// Register API routes
// app.use('/api/products', productRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/routes', routesRoutes);

// 404 middleware - handle routes that don't exist
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Server class with ES6 class syntax
class Server {
  constructor(app, port) {
    this.port = port;
    this.app = app;
    this.instance = null;
  }

  start() {
    this.instance = this.app.listen(this.port, () => {
      console.log(`🚀 Server is running at http://localhost:${this.port}`);
    });
    return this.instance;
  }

  shutdown(exitCode = 0) {
    return new Promise((resolve) => {
      console.log('🛑 Shutting down server gracefully...');
      if (this.instance) {
        this.instance.close(() => {
          console.log('✅ Server closed successfully');
          resolve();
          if (exitCode !== undefined) {
            process.exit(exitCode);
          }
        });
      } else {
        resolve();
        if (exitCode !== undefined) {
          process.exit(exitCode);
        }
      }
    });
  }
}

// Initialize and start server
const server = new Server(app, PORT);
server.start();

// Handle server shutdown gracefully
process.on('SIGTERM', () => server.shutdown(0));
process.on('SIGINT', () => server.shutdown(0));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  server.shutdown(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  server.shutdown(1);
});
