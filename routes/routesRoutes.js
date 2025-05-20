import express from 'express';
import { getAllRoutes } from '../controllers/routesController.js';

const router = express.Router();

/**
 * Routes routes
 * Base path: /api/routes
 */

/**
 * @route   GET /api/routes
 * @desc    Get information about all available API routes
 * @access  Public
 * @returns {Object} Response with routes information
 */
router.get('/', (req, res) => {
  return getAllRoutes()(req, res);
});

export default router;