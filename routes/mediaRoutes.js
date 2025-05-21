import express from 'express';
import { createMediaExporter, downloadExportedFile, getMediaList, getMediaById, exportMetaProperties } from '../controllers/mediaController.js';

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
 * @query   {string} orientation - Filter by orientation (e.g., 'portrait', 'landscape')
 * @query   {string} dateModifiedOn - Filter by modification date (YYYY-MM-DD format)
 * @query   {string} dateCreatedOn - Filter by creation date (YYYY-MM-DD format)
 * @query   {string} ids - Comma-separated list of media IDs to filter by
 * @query   {string} categoryId - Filter by category ID
 * @query   {string} brandId - Filter by brand ID
 * @query   {string} type - Filter by media type (e.g., 'image', 'video', 'document', 'audio', '3d')
 * @query   {boolean} limited - Filter by limited status (true/false)
 * @query   {boolean} isPublic - Filter by public status (true/false)
 * @query   {string} property_[MetapropertyName] - Filter by custom metaproperty value (e.g., property_AssetSubType='Stock Photo')
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
/**
 * @route   GET /api/media/exportMetaProperties
 * @desc    Export all meta-properties and their options to XLSX file
 * @access  Public
 * @query   {string} filename - Custom filename for the export
 * @returns {Object} Response with download URL
 */
router.get('/exportMetaProperties', (req, res, next) => {
  req.setTimeout(120000); // Set 2min timeout for potentially long-running exports
  next();
}, (req, res) => {
  const bynderInstance = req.app.locals.bynder;
  return exportMetaProperties(bynderInstance)(req, res);
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