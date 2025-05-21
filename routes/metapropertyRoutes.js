import express from 'express';
import { getMetapropertyList } from '../controllers/metapropertyController.js';

const router = express.Router();

/**
 * Metaproperty routes
 * Base path: /api/metaproperties
 */

/**
 * @route   GET /api/metaproperties/list
 * @desc    Get all metaproperties from Bynder
 * @access  Public
 * @query   {number} options - Include options (1) or not (0) (default: 1)
 * @query   {number} count - Include count (1) or not (0) (default: 1)
 * @returns {Object} JSON response with metaproperties
 */
router.get('/list', (req, res, next) => {
  req.setTimeout(60000); // Set 1min timeout for potentially large requests
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return getMetapropertyList(bynderInstance)(req, res);
});

export default router;