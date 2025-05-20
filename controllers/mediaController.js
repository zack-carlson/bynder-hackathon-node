import { successResponse, errorResponse, paginationMeta } from '../utils/responseUtils.js';
import XLSX from 'xlsx';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(uploadsDir);

/**
 * Export all media from Bynder to XLSX file
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const createMediaExporter = (bynderInstance) => {
  /**
   * Export all media to XLSX
   */
  return async (req, res) => {
    try {
      // Extract domain from the base URL and slugify it for the filename
      const bynderDomain = process.env.BYNDER_DOMAIN || 'default';
      const instanceSlug = slugifyDomain(bynderDomain);
      
      // Format: <<export-type>>-<<instance>>-<<timestamp>>.xlsx
      const defaultFilename = `media-${instanceSlug}-${Date.now()}.xlsx`;
      
      const { limit = 1000, filename = defaultFilename } = req.query;

      // Log the export request
      console.log(`Starting media export with limit: ${limit}`);

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Fetch all media from Bynder
      console.log('Fetching media from Bynder...');
      const mediaItems = await getAllMediaItems(bynderInstance, parseInt(limit));
      console.log(`Retrieved ${mediaItems.length} media items`);

      if (mediaItems.length === 0) {
        return res.status(404).json(
          successResponse(null, 'No media items found to export')
        );
      }

      // Convert to XLSX and save file
      console.log('Converting to XLSX format...');
      const filePath = await createXLSXFile(mediaItems, filename);
      console.log(`XLSX file created at: ${filePath}`);

      // Generate download URL
      const downloadUrl = `/api/media/download/${path.basename(filePath)}`;

      // Return success with download URL
      return res.status(200).json(
        successResponse({
          totalItems: mediaItems.length,
          downloadUrl: downloadUrl,
          filename: path.basename(filePath)
        }, 'Media export completed successfully')
      );
    } catch (error) {
      console.error('Error exporting media:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to export media data',
        'MEDIA_EXPORT_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Serve exported XLSX file
 */
export const downloadExportedFile = (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      const { response, statusCode } = errorResponse(
        'Export file not found',
        'FILE_NOT_FOUND',
        404
      );
      return res.status(statusCode).json(response);
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to download file',
      'DOWNLOAD_ERROR',
      500,
      error
    );
    return res.status(statusCode).json(response);
  }
};

/**
 * Fetch all media items from Bynder, handling pagination
 * @param {Object} bynder - Bynder SDK instance
 * @param {Number} limit - Max number of items to fetch
 * @returns {Promise<Array>} Array of media items
 */
async function getAllMediaItems(bynder, limit) {
  try {
    // For testing without actual API access, return mock data
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
      return generateMockData(Math.min(limit, 100));
    }
    
    const allMedia = [];
    let page = 1;
    let hasMoreItems = true;
    const pageSize = 100; // Max page size for Bynder API
    
    while (hasMoreItems && allMedia.length < limit) {
      const query = {
        page,
        limit: Math.min(pageSize, limit - allMedia.length),
        total: 0 // Set to 0 to avoid counting total (faster)
      };
      
      console.log(`Fetching page ${page} with limit ${query.limit}...`);
      
      // Get media page from Bynder
      const mediaPage = await bynder.getMediaList(query);
      
      if (!mediaPage || !mediaPage.length) {
        hasMoreItems = false;
      } else {
        allMedia.push(...mediaPage);
        page++;
        
        // Stop if we've reached the requested limit
        if (allMedia.length >= limit) {
          hasMoreItems = false;
        }
      }
    }
    
    return allMedia;
  } catch (error) {
    console.error('Error fetching media from Bynder:', error);
    throw error;
  }
}

/**
 * Create XLSX file from media items
 * @param {Array} mediaItems - Array of media items from Bynder
 * @param {String} filename - Output filename
 * @returns {Promise<String>} Path to the created file
 */
async function createXLSXFile(mediaItems, filename) {
  try {
    // Transform media data to tabular format
    const worksheetData = mediaItems.map(item => {
      // Start with an empty object for this row
      const rowData = {};
      
      // Process all keys in the item
      Object.keys(item).forEach(key => {
        const value = item[key];
        
        // Handle null or undefined values
        if (value === null || value === undefined) {
          rowData[key] = '';
          return;
        }
        
        // Handle metaproperties (property_*)
        if (key.startsWith('property_')) {
          // If it's an array, join the values
          if (Array.isArray(value)) {
            rowData[key] = value.join(', ');
          } else if (typeof value === 'object') {
            // Handle object metaproperties
            rowData[key] = JSON.stringify(value);
          } else {
            // Regular value
            rowData[key] = value;
          }
        }
        // Handle special case for fileSize
        else if (key === 'fileSize') {
          rowData[key] = formatFileSize(value);
        }
        // Handle tags array
        else if (key === 'tags' && Array.isArray(value)) {
          rowData[key] = value.join(', ');
        }
        // Handle thumbnails object
        else if (key === 'thumbnails' && typeof value === 'object') {
          // Create separate columns for each thumbnail size
          Object.keys(value).forEach(thumbSize => {
            rowData[`thumbnails_${thumbSize}`] = value[thumbSize];
          });
        }
        // Handle other objects by creating a new column for each property
        else if (typeof value === 'object' && !Array.isArray(value)) {
          Object.keys(value).forEach(subKey => {
            // Handle nested arrays
            if (Array.isArray(value[subKey])) {
              rowData[`${key}_${subKey}`] = value[subKey].join(', ');
            } else if (typeof value[subKey] === 'object' && value[subKey] !== null) {
              // For deeply nested objects, stringify them
              rowData[`${key}_${subKey}`] = JSON.stringify(value[subKey]);
            } else {
              rowData[`${key}_${subKey}`] = value[subKey];
            }
          });
        }
        // Handle arrays that aren't metaproperties or tags
        else if (Array.isArray(value)) {
          rowData[key] = value.join(', ');
        }
        // Regular simple values
        else {
          rowData[key] = value;
        }
      });
      
      return rowData;
    });
    
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bynder Media');
    
    // Auto-size columns
    const colWidths = worksheetData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const cellValue = String(row[key]);
        acc[key] = Math.max(acc[key] || 0, cellValue.length);
      });
      return acc;
    }, {});
    
    worksheet['!cols'] = Object.keys(colWidths).map(key => ({ wch: Math.min(colWidths[key] + 2, 50) }));
    
    // Create the file path
    const filePath = path.join(uploadsDir, filename);
    
    // Write to file
    XLSX.writeFile(workbook, filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error creating XLSX file:', error);
    throw error;
  }
}

/**
 * Generate mock media data for testing
 * @param {Number} count - Number of items to generate
 * @returns {Array} Array of mock media items
 */
function generateMockData(count) {
  const types = ['image', 'video', 'document', 'audio'];
  const extensions = ['jpg', 'png', 'pdf', 'mp4', 'docx'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-id-${i + 1}`,
    name: `Mock Media ${i + 1}`,
    description: `This is a mock media item ${i + 1} for testing purposes`,
    type: types[Math.floor(Math.random() * types.length)],
    originalUrl: `https://example.com/media/${i + 1}`,
    thumbnailUrl: `https://example.com/media/${i + 1}/thumbnail`,
    dateCreated: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    dateModified: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    width: Math.floor(Math.random() * 2000) + 500,
    height: Math.floor(Math.random() * 2000) + 500,
    fileSize: Math.floor(Math.random() * 10000000),
    extension: extensions[Math.floor(Math.random() * extensions.length)],
    tags: Array.from(
      { length: Math.floor(Math.random() * 5) + 1 },
      (_, j) => `tag-${j + 1}`
    )
  }));
}

/**
 * Format file size from bytes to human-readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} Formatted file size
 */
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Slugify a domain URL for use in filenames
 * @param {String} domainUrl - Domain URL to slugify
 * @returns {String} Slugified domain
 */
function slugifyDomain(domainUrl) {
  if (!domainUrl) return 'unknown';
  
  // Remove protocol (http:// or https://)
  let domain = domainUrl.replace(/^https?:\/\//, '');
  
  // Remove trailing slashes and paths
  domain = domain.split('/')[0];
  
  // Remove .com, .org, etc.
  domain = domain.replace(/\.(com|org|net|io|biz|co|dev)$/, '');
  
  // Replace dots, underscores and spaces with dashes
  domain = domain.replace(/[\._\s]+/g, '-');
  
  // Remove any invalid characters and convert to lowercase
  domain = domain.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  
  // Remove leading/trailing dashes
  domain = domain.replace(/^-+|-+$/g, '');
  
  return domain;
}

/**
 * Get all media from Bynder as JSON
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const getMediaList = (bynderInstance) => {
  return async (req, res) => {
    try {
      // Extract query parameters with defaults
      const {
        limit = 100,
        page = 1,
        sortBy = 'dateCreated',
        sortOrder = 'desc'
      } = req.query;

      const limitValue = Math.min(parseInt(limit), 1000); // Cap maximum limit
      const pageValue = parseInt(page);

      // Log the request
      console.log(`Getting media list with limit: ${limitValue}, page: ${pageValue}`);

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Fetch media items from Bynder
      console.log('Fetching media from Bynder...');
      const mediaItems = await getAllMediaItems(bynderInstance, limitValue);
      console.log(`Retrieved ${mediaItems.length} media items`);

      // Return success with data
      return res.status(200).json(
        successResponse(mediaItems, 'Media items retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting media list:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve media data',
        'MEDIA_LIST_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Get single media item by ID
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const getMediaById = (bynderInstance) => {
  return async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        const { response, statusCode } = errorResponse(
          'Media ID is required',
          'INVALID_PARAMETER',
          400
        );
        return res.status(statusCode).json(response);
      }

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      console.log(`Fetching media item with ID: ${id}`);

      // For development with mock data
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
        const mockItem = generateMockData(1)[0];
        mockItem.id = id;
        return res.status(200).json(successResponse(mockItem, 'Media item retrieved successfully'));
      }
      
      // Make API call to get single media item
      try {
        // Using the Bynder SDK to get media info, targeting the /media/v7/{id} endpoint
        const mediaItem = await bynderInstance.getMediaInfo({ id });
        
        if (!mediaItem) {
          const { response, statusCode } = errorResponse(
            'Media item not found',
            'RESOURCE_NOT_FOUND',
            404
          );
          return res.status(statusCode).json(response);
        }
        
        return res.status(200).json(
          successResponse(mediaItem, 'Media item retrieved successfully')
        );
      } catch (apiError) {
        // Handle specific API errors
        console.error('Bynder API error:', apiError);
        
        const statusCode = apiError.status || 500;
        const errorCode = statusCode === 404 ? 'MEDIA_NOT_FOUND' : 'BYNDER_API_ERROR';
        const message = statusCode === 404
          ? `Media item with ID ${id} not found`
          : apiError.message || 'Error retrieving media from Bynder';
          
        const { response } = errorResponse(message, errorCode, statusCode, apiError);
        return res.status(statusCode).json(response);
      }
    } catch (error) {
      console.error('Error getting media by ID:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve media data',
        'MEDIA_FETCH_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};