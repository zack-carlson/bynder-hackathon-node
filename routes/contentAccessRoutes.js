import express from 'express';
import { getMetapropertyList, getMetapropertyById } from '../controllers/contentAccessController.js';

const router = express.Router();

/**
 * Content Access routes
 * Base path: /api/content_access
 */

/**
 * @route   GET /api/content_access/metaproperties/list
 * @desc    Get all metaproperties from Bynder via content access API
 * @access  Public
 * @returns {Object} JSON response with metaproperties
 */
router.get('/metaproperties/list', (req, res, next) => {
  req.setTimeout(60000); // Set 1min timeout for potentially large requests
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return getMetapropertyList(bynderInstance)(req, res);
});

/**
 * @route   GET /api/content_access/metaproperties/:id
 * @desc    Get a specific metaproperty by ID via content access API
 * @access  Public
 * @param   {string} id - Metaproperty ID
 * @returns {Object} JSON response with metaproperty details
 */
router.get('/metaproperties/:id', (req, res, next) => {
  req.setTimeout(30000); // Set 30sec timeout
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return getMetapropertyById(bynderInstance)(req, res);
});

export default router;