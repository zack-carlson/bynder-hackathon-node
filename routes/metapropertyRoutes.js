import express from 'express';
import { getMetapropertyList, exportAllMetaProperties } from '../controllers/metapropertyController.js';

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

/**
 * @route   GET /api/metaproperties/exportAllMetaProperties
 * @desc    Export all metaproperties and their options to XLSX file
 * @access  Public
 * @query   {string} filename - Custom filename for the export
 * @returns {Object} Response with download URL
 */
router.get('/exportAllMetaProperties', (req, res, next) => {
  req.setTimeout(120000); // Set 2min timeout for potentially long-running exports
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return exportAllMetaProperties(bynderInstance)(req, res);
});

export default router;