import express from 'express';
import { createMediaExporter, downloadExportedFile, getMediaList, getMediaById } from '../controllers/mediaController.js';

const router = express.Router();

/**
 * Media routes
 * Base path: /api/media
 */

/**
 * @route   GET /api/media/exportAllMedia
 * @desc    Export all media to XLSX file
 * @access  Public
 * @query   {number} limit - Maximum number of media items to export
 * @query   {string} filename - Custom filename for the export
 * @returns {Object} Response with download URL
 */
router.get('/exportAllMedia', (req, res, next) => {
  req.setTimeout(300000); // Set 5min timeout for long-running exports
  next();
}, (req, res) => {
  // Access the Bynder instance from app.locals
  const bynderInstance = req.app.locals.bynder;
  return createMediaExporter(bynderInstance)(req, res);
});

/**
 * @route   GET /api/media/download/:filename
 * @desc    Download exported XLSX file
 * @access  Public
 * @param   {string} filename - Filename of the export to download
 * @returns {File} XLSX file download
 */
router.get('/download/:filename', downloadExportedFile);

/**
 * @route   GET /api/media/list
 * @desc    Get all media as JSON
 * @access  Public
 * @query   {number} limit - Maximum number of media items to retrieve (default: 100, max: 1000)
 * @query   {number} page - Page number for pagination (default: 1)
 * @query   {string} sortBy - Field to sort by (default: 'dateCreated')
 * @query   {string} sortOrder - Sort order ('asc' or 'desc', default: 'desc')
 * @returns {Object} JSON response with media items
 */
router.get('/list', (req, res, next) => {
  req.setTimeout(120000); // Set 2min timeout for potentially large requests
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return getMediaList(bynderInstance)(req, res);
});

/**
 * @route   GET /api/media/:id
 * @desc    Get a single media item by ID
 * @access  Public
 * @param   {string} id - Bynder media ID
 * @returns {Object} JSON response with media item details
 */
router.get('/:id', (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return getMediaById(bynderInstance)(req, res);
});

export default router;