import { successResponse, errorResponse, paginationMeta } from '../utils/responseUtils.js';
import { Buffer } from 'buffer';
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
      
      // Extract query parameters
      const { 
        limit = 1000, 
        filename = defaultFilename,
        type,
        orderBy,
        limited,
        orientation
      } = req.query;

      // Log the export request
      console.log(`Starting media export with parameters: limit=${limit}, type=${type || 'all'}, orientation=${orientation || 'all'}, limited=${limited || 'all'}`);

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Fetch all media from Bynder
      console.log('Fetching media from Bynder...');
      
      // Call the API
      const mediaItems = await fetchMediaFromBynder(bynderInstance, {
        limit: parseInt(limit),
        type,
        limited,
        orientation,
        orderBy
      });
      
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
 * Simplified function to fetch media items from Bynder with pagination
 * @param {Object} bynder - Bynder SDK instance
 * @param {Object} queryParams - Query parameters for filtering
 * @returns {Promise<Array>} Array of media items
 */
async function fetchMediaFromBynder(bynder, queryParams) {
  try {
    console.log('Fetching media with parameters:', queryParams);
    
    // Initialize result array
    const allMedia = [];
    
    // Set up pagination
    let page = 1;
    let hasMoreItems = true;
    const pageSize = 100; // Max page size for Bynder API
    const limit = parseInt(queryParams.limit) || 100;
    
    // Create API query object with Bynder-compatible parameter names
    const apiQuery = {
      page,
      limit: Math.min(pageSize, limit),
      total: 1, // Get total count for first page
    };
    
    // Add filters using Bynder API parameter names - only if they are valid values
    if (queryParams.type && queryParams.type !== undefined && queryParams.type !== null && queryParams.type !== '') {
      apiQuery.type = queryParams.type;
      console.log(`Adding type filter: ${queryParams.type}`);
    }
    
    if (queryParams.limited && queryParams.limited !== undefined && queryParams.limited !== null && queryParams.limited !== '') {
      apiQuery.limited = queryParams.limited;
      console.log(`Adding limited filter: ${queryParams.limited}`);
    }
    
    if (queryParams.orientation && queryParams.orientation !== undefined && queryParams.orientation !== null && queryParams.orientation !== '') {
      apiQuery.orientation = queryParams.orientation;
      console.log(`Adding orientation filter: ${queryParams.orientation}`);
    }
    
    if (queryParams.orderBy && queryParams.orderBy !== undefined && queryParams.orderBy !== null && queryParams.orderBy !== '') {
      apiQuery.orderBy = queryParams.orderBy;
      console.log(`Adding orderBy: ${queryParams.orderBy}`);
    }
    
    // Final safety check - remove any lingering undefined, null, or empty string values
    Object.keys(apiQuery).forEach(key => {
      if (apiQuery[key] === undefined || apiQuery[key] === null || apiQuery[key] === '') {
        console.log(`Removing empty parameter: ${key}`);
        delete apiQuery[key];
      }
    });
    
    console.log('Initial Bynder API query:', apiQuery);
    
    // Fetch data with pagination
    while (hasMoreItems && allMedia.length < limit) {
      apiQuery.page = page;
      apiQuery.limit = Math.min(pageSize, limit - allMedia.length);
      
      console.log(`Fetching page ${page} with limit ${apiQuery.limit}...`);
      
      try {
        // Do one final check before API call to ensure no undefined values
        Object.keys(apiQuery).forEach(key => {
          if (apiQuery[key] === undefined || apiQuery[key] === null || apiQuery[key] === '') {
            console.log(`Removing undefined parameter before API call: ${key}`);
            delete apiQuery[key];
          }
        });
        
        console.log('Clean query sent to Bynder API:', JSON.stringify(apiQuery, null, 2));
        
        // Call Bynder API with cleaned parameters
        const response = await bynder.getMediaList(apiQuery);
        console.log(`Got response from Bynder API: ${typeof response}`);
        
        // Process response
        if (Array.isArray(response) && response.length > 0) {
          console.log(`Received ${response.length} items from Bynder API`);
          allMedia.push(...response);
          page++;
          
          // Check if we need more pages
          if (allMedia.length >= limit) {
            hasMoreItems = false;
          }
        } else {
          // No more items
          console.log('No more items found or empty response');
          hasMoreItems = false;
        }
      } catch (error) {
        console.error('Error fetching page from Bynder:', error);
        hasMoreItems = false;
      }
      
      // After first page, no need for total count
      if (apiQuery.total === 1) {
        apiQuery.total = 0;
      }
    }
    
    console.log(`Fetched a total of ${allMedia.length} media items from Bynder`);
    return allMedia;
  } catch (error) {
    console.error('Error in fetchMediaFromBynder:', error);
    throw new Error(`Failed to fetch media from Bynder: ${error.message}`);
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
      // Log request details
      console.log('\n======== MEDIA LIST API REQUEST ========');
      console.log('Query parameters:', req.query);
      
      // Extract query parameters with defaults
      const { 
        limit = 100, 
        page = 1,
        type,
        orderBy,
        includeMediaItems = '1',
        limitedUsage,
        orientation
      } = req.query;

      const limitValue = Math.min(parseInt(limit), 1000);
      
      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Create query parameters object for Bynder API - only add defined values
      const queryParams = {
        limit: limitValue,
        page: parseInt(page) || 1
      };
      
      // Add optional parameters only if they have valid values
      if (type !== undefined && type !== null && type !== '') {
        queryParams.type = type;
      }
      
      if (orderBy !== undefined && orderBy !== null && orderBy !== '') {
        queryParams.orderBy = orderBy;
      }
      
      // Use proper Bynder API parameter name (limited instead of limitedUsage)
      if (limitedUsage !== undefined && limitedUsage !== null && limitedUsage !== '') {
        queryParams.limited = limitedUsage;
      }
      
      if (orientation !== undefined && orientation !== null && orientation !== '') {
        queryParams.orientation = orientation;
      }
      
      console.log('Fetching media with parameters:', queryParams);
      
      // Call fetchMediaFromBynder function with the parameters
      const mediaItems = await fetchMediaFromBynder(bynderInstance, queryParams);
      
      console.log(`Retrieved ${mediaItems.length} media items to return to client`);

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

/**
 * Get meta-properties list as JSON
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const getMetaPropertiesList = (bynderInstance) => {
  return async (req, res) => {
    try {
      // Log request details
      console.log('\n======== META PROPERTIES LIST REQUEST ========');
      console.log('Query parameters:', req.query);
      
      // Extract query parameters
      const { 
        limit = 100,
        type, 
        limitedUsage, 
        orientation 
      } = req.query;
      
      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Create query parameters for fetching media
      const queryParams = {
        limit: parseInt(limit)
      };
      
      // Only add parameters that have valid values
      if (type && type !== '') {
        queryParams.type = type;
      }
      
      // Convert limitedUsage to limited as per Bynder API
      if (limitedUsage && limitedUsage !== '') {
        queryParams.limited = limitedUsage;
      }
      
      if (orientation && orientation !== '') {
        queryParams.orientation = orientation;
      }
      
      // Fetch media items to extract meta-properties
      console.log('Fetching media to extract meta-properties...');
      const mediaItems = await fetchMediaFromBynder(bynderInstance, queryParams);
      
      if (mediaItems.length === 0) {
        return res.status(404).json(
          successResponse(null, 'No media items found to extract meta-properties')
        );
      }
      
      // Extract and organize meta-properties
      console.log('Extracting meta-properties...');
      const { properties, propertyOptions } = extractMetaProperties(mediaItems);
      
      // Format response
      const response = {
        properties: Object.values(properties),
        propertyOptions: Object.values(propertyOptions),
        totalProperties: Object.keys(properties).length,
        totalOptions: Object.keys(propertyOptions).length,
        mediaItemsSampled: mediaItems.length
      };
      
      // Return success with meta-properties data
      return res.status(200).json(
        successResponse(response, 'Meta-properties retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting meta-properties:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve meta-property data',
        'META_PROPERTY_LIST_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Export meta-properties and their options to XLSX
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const exportMetaProperties = (bynderInstance) => {
  return async (req, res) => {
    try {
      // Extract domain from the base URL and slugify it for the filename
      const bynderDomain = process.env.BYNDER_DOMAIN || 'default';
      const instanceSlug = slugifyDomain(bynderDomain);
      
      // Format: <<export-type>>-<<instance>>-<<timestamp>>.xlsx
      const defaultFilename = `meta-properties-${instanceSlug}-${Date.now()}.xlsx`;
      
      const {
        filename = defaultFilename,
        type,
        limitedUsage,
        orientation
      } = req.query;
      
      // Enhanced debug logging
      console.log('\n======== META PROPERTIES EXPORT REQUEST ========');
      console.log('Query parameters:', req.query);
      console.log('================================================');

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // Create query parameters using correct Bynder parameter names
      const queryParams = {
        limit: 100 // Limit to 100 items for faster processing
      };
      
      // Only add parameters that have valid values
      if (type !== undefined && type !== null && type !== '') {
        queryParams.type = type;
      }
      
      // Convert limitedUsage to limited as per Bynder API
      if (limitedUsage !== undefined && limitedUsage !== null && limitedUsage !== '') {
        queryParams.limited = limitedUsage;
      }
      
      if (orientation !== undefined && orientation !== null && orientation !== '') {
        queryParams.orientation = orientation;
      }
      
      // Fetch media with filters
      console.log('Fetching media to extract meta-properties with parameters:', queryParams);
      const mediaItems = await fetchMediaFromBynder(bynderInstance, queryParams);
      
      console.log(`Retrieved ${mediaItems.length} media items for meta-property extraction`);

      if (mediaItems.length === 0) {
        console.log('No media items found to extract meta-properties');
        return res.status(404).json(
          successResponse(null, 'No media items found to extract meta-properties')
        );
      }
      
      // Extract and organize meta-properties
      console.log('Extracting meta-properties...');
      const { properties, propertyOptions } = extractMetaProperties(mediaItems);
      
      console.log(`Extracted ${Object.keys(properties).length} meta-properties and ${Object.keys(propertyOptions).length} property options`);
      
      // Convert to XLSX and save file
      console.log('Converting to XLSX format...');
      const filePath = await createMetaPropertiesXLSX(properties, propertyOptions, filename);
      console.log(`XLSX file created at: ${filePath}`);

      // Generate download URL
      const downloadUrl = `/api/media/download/${path.basename(filePath)}`;

      // Return success with download URL
      return res.status(200).json(
        successResponse({
          propertiesCount: Object.keys(properties).length,
          optionsCount: Object.keys(propertyOptions).length,
          downloadUrl: downloadUrl,
          filename: path.basename(filePath)
        }, 'Meta-properties export completed successfully')
      );
    } catch (error) {
      console.error('Error exporting meta-properties:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to export meta-property data',
        'META_PROPERTY_EXPORT_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Extract meta-properties and their options from media items
 * @param {Array} mediaItems - Array of media items from Bynder
 * @returns {Object} Object containing properties and propertyOptions
 */
function extractMetaProperties(mediaItems) {
  // Store properties and their values
  const properties = {};
  // Store property options with parent IDs
  const propertyOptions = {};

  // Process each media item
  mediaItems.forEach(item => {
    // Find all property_ fields
    Object.keys(item).forEach(key => {
      if (key.startsWith('property_')) {
        const propertyName = key;
        const propertyValue = item[key];
        
        // Initialize property if not exists
        if (!properties[propertyName]) {
          properties[propertyName] = {
            id: propertyName,
            name: propertyName.replace('property_', '').replace(/_/g, ' '),
            values: new Set()
          };
        }
        
        // Add values
        if (Array.isArray(propertyValue)) {
          propertyValue.forEach(val => {
            if (val !== null && val !== undefined) {
              // If value is an object, it's likely an option with ID and label
              if (typeof val === 'object') {
                properties[propertyName].values.add(val.label || JSON.stringify(val));
                
                // Store option with parent ID
                const optionId = val.id || JSON.stringify(val);
                propertyOptions[optionId] = {
                  id: optionId,
                  label: val.label || JSON.stringify(val),
                  parentProperty: propertyName
                };
              } else {
                properties[propertyName].values.add(val);
              }
            }
          });
        } else if (propertyValue !== null && propertyValue !== undefined) {
          // Handle non-array values
          if (typeof propertyValue === 'object') {
            properties[propertyName].values.add(propertyValue.label || JSON.stringify(propertyValue));
            
            // Store option with parent ID
            const optionId = propertyValue.id || JSON.stringify(propertyValue);
            propertyOptions[optionId] = {
              id: optionId,
              label: propertyValue.label || JSON.stringify(propertyValue),
              parentProperty: propertyName
            };
          } else {
            properties[propertyName].values.add(propertyValue);
          }
        }
      }
    });
  });

  // Convert Sets to Arrays for easier processing
  Object.keys(properties).forEach(key => {
    properties[key].values = Array.from(properties[key].values);
  });

  return { properties, propertyOptions };
}

/**
 * Create XLSX file for meta-properties and options
 * @param {Object} properties - Object of properties
 * @param {Object} propertyOptions - Object of property options
 * @param {String} filename - Output filename
 * @returns {Promise<String>} Path to the created file
 */
async function createMetaPropertiesXLSX(properties, propertyOptions, filename) {
  try {
    // Transform properties to tabular format
    const propertiesData = Object.values(properties).map(property => {
      return {
        'ID': property.id || '',
        'Name': property.name || '',
        'Values': property.values.join(', ')
      };
    });
    
    // Transform options to tabular format
    const optionsData = Object.values(propertyOptions).map(option => {
      return {
        'ID': option.id || '',
        'Label': option.label || '',
        'Parent Property': option.parentProperty || ''
      };
    });
    
    // Create workbook with two sheets
    const workbook = XLSX.utils.book_new();
    
    // Add properties sheet
    const propertiesSheet = XLSX.utils.json_to_sheet(propertiesData);
    XLSX.utils.book_append_sheet(workbook, propertiesSheet, 'Meta Properties');
    
    // Auto-size columns for properties sheet
    const propColWidths = propertiesData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const cellValue = String(row[key]);
        acc[key] = Math.max(acc[key] || 0, cellValue.length);
      });
      return acc;
    }, {});
    
    propertiesSheet['!cols'] = Object.keys(propColWidths).map(key => ({ wch: Math.min(propColWidths[key] + 2, 50) }));
    
    // Add options sheet
    const optionsSheet = XLSX.utils.json_to_sheet(optionsData);
    XLSX.utils.book_append_sheet(workbook, optionsSheet, 'Property Options');
    
    // Auto-size columns for options sheet
    const optColWidths = optionsData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const cellValue = String(row[key]);
        acc[key] = Math.max(acc[key] || 0, cellValue.length);
      });
      return acc;
    }, {});
    
    optionsSheet['!cols'] = Object.keys(optColWidths).map(key => ({ wch: Math.min(optColWidths[key] + 2, 50) }));
    
    // Create the file path
    const filePath = path.join(uploadsDir, filename);
    
    // Write to file
    XLSX.writeFile(workbook, filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error creating meta-properties XLSX file:', error);
    throw error;
  }
}