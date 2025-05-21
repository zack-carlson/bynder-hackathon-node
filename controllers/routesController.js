import { successResponse, errorResponse } from '../utils/responseUtils.js';

/**
 * Get information about all available API routes
 * @returns {Function} Express middleware function
 */
export const getAllRoutes = (app) => {
  return (req, res) => {
    try {
      // Create a collection of route information
      const routes = [];
      
      // Media Routes
      routes.push({
        path: '/api/media/list',
        method: 'GET',
        description: 'Get all media as JSON',
        parameters: {
          query: {
            limit: {
              type: 'number',
              description: 'Maximum number of media items to retrieve',
              default: 100,
              max: 1000,
              required: false
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              default: 1,
              required: false
            },
            sortBy: {
              type: 'string',
              description: 'Field to sort by',
              default: 'dateCreated',
              required: false
            },
            sortOrder: {
              type: 'string',
              description: 'Sort order (asc or desc)',
              default: 'desc',
              required: false
            },
            orientation: {
              type: 'string',
              description: 'Filter by orientation (e.g., portrait, landscape)',
              required: false
            },
            dateModifiedOn: {
              type: 'string',
              description: 'Filter by modification date (YYYY-MM-DD format)',
              required: false
            },
            dateCreatedOn: {
              type: 'string',
              description: 'Filter by creation date (YYYY-MM-DD format)',
              required: false
            },
            ids: {
              type: 'string',
              description: 'Comma-separated list of media IDs to filter by',
              required: false
            },
            categoryId: {
              type: 'string',
              description: 'Filter by category ID',
              required: false
            },
            brandId: {
              type: 'string',
              description: 'Filter by brand ID',
              required: false
            },
            type: {
              type: 'string',
              description: 'Filter by media type (e.g., image, video, document, audio, 3d)',
              required: false
            },
            limited: {
              type: 'boolean',
              description: 'Filter by limited status',
              required: false
            },
            isPublic: {
              type: 'boolean',
              description: 'Filter by public status',
              required: false
            },
            'property_*': {
              type: 'string',
              description: 'Filter by custom metaproperty value (e.g., property_AssetSubType=Stock Photo)',
              required: false
            }
          }
        }
      });
      
      routes.push({
        path: '/api/media/:id',
        method: 'GET',
        description: 'Get a single media item by ID',
        parameters: {
          path: {
            id: {
              type: 'string',
              description: 'Bynder media ID',
              required: true
            }
          }
        }
      });
      
      routes.push({
        path: '/api/media/exportAllMedia',
        method: 'GET',
        description: 'Export all media to XLSX file',
        parameters: {
          query: {
            limit: {
              type: 'number',
              description: 'Maximum number of media items to export',
              default: 1000,
              required: false
            },
            filename: {
              type: 'string',
              description: 'Custom filename for the export',
              required: false
            },
            orientation: {
              type: 'string',
              description: 'Filter by orientation (e.g., portrait, landscape)',
              required: false
            },
            dateModifiedOn: {
              type: 'string',
              description: 'Filter by modification date (YYYY-MM-DD format)',
              required: false
            },
            dateCreatedOn: {
              type: 'string',
              description: 'Filter by creation date (YYYY-MM-DD format)',
              required: false
            },
            ids: {
              type: 'string',
              description: 'Comma-separated list of media IDs to filter by',
              required: false
            },
            categoryId: {
              type: 'string',
              description: 'Filter by category ID',
              required: false
            },
            brandId: {
              type: 'string',
              description: 'Filter by brand ID',
              required: false
            },
            type: {
              type: 'string',
              description: 'Filter by media type (e.g., image, video, document, audio, 3d)',
              required: false
            },
            limited: {
              type: 'boolean',
              description: 'Filter by limited status',
              required: false
            },
            isPublic: {
              type: 'boolean',
              description: 'Filter by public status',
              required: false
            },
            'property_*': {
              type: 'string',
              description: 'Filter by custom metaproperty value (e.g., property_AssetSubType=Stock Photo)',
              required: false
            }
          }
        }
      });
      
      routes.push({
        path: '/api/media/download/:filename',
        method: 'GET',
        description: 'Download exported XLSX file',
        parameters: {
          path: {
            filename: {
              type: 'string',
              description: 'Filename of the export to download',
              required: true
            }
          }
        }
      });
      
      routes.push({
        path: '/api/media/exportMetaProperties',
        method: 'GET',
        description: 'Export all meta-properties and their options to XLSX file',
        parameters: {
          query: {
            filename: {
              type: 'string',
              description: 'Custom filename for the export',
              required: false
            }
          }
        }
      });
      
      // Add Metaproperties endpoints
      routes.push({
        path: '/api/metaproperties/list',
        method: 'GET',
        description: 'Get all metaproperties from Bynder',
        parameters: {
          query: {
            options: {
              type: 'number',
              description: 'Include options (1) or not (0)',
              default: 1,
              required: false
            },
            count: {
              type: 'number',
              description: 'Include count (1) or not (0)',
              default: 1,
              required: false
            }
          }
        }
      });
      
      routes.push({
        path: '/api/metaproperties/exportAllMetaProperties',
        method: 'GET',
        description: 'Export all metaproperties and their options to XLSX file with two sheets',
        parameters: {
          query: {
            filename: {
              type: 'string',
              description: 'Custom filename for the export',
              required: false
            }
          }
        }
      });

      routes.push({
        path: '/api/routes',
        method: 'GET',
        description: 'Get information about all available API routes',
        parameters: {}
      });
      
      return res.status(200).json(
        successResponse(routes, 'API routes retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting API routes:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve API routes',
        'ROUTES_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};