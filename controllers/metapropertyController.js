import { successResponse, errorResponse } from '../utils/responseUtils.js';

/**
 * Get a list of metaproperties from Bynder
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const getMetapropertyList = (bynderInstance) => {
  return async (req, res) => {
    try {
      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      console.log('Fetching metaproperties from Bynder...');
      
      // Default to options=1 to include options and count=1 for property counts
      const options = req.query.options !== undefined ? req.query.options : 1;
      const count = req.query.count !== undefined ? req.query.count : 1;
      
      // Make API call to get metaproperties
      const query = {
        options,
        count
      };
      
      // For development with mock data
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
        return res.status(200).json(
          successResponse(generateMockMetaproperties(), 'Metaproperties retrieved successfully')
        );
      }
      
      // Call Bynder API to get metaproperties
      const metaproperties = await bynderInstance.getMetaproperties(query);
      
      console.log(`Retrieved ${Object.keys(metaproperties || {}).length} metaproperties`);
      
      // Return success with data
      return res.status(200).json(
        successResponse(metaproperties, 'Metaproperties retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting metaproperties:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve metaproperties',
        'METAPROPERTY_LIST_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Generate mock metaproperty data for testing
 * @returns {Object} Mock metaproperty data
 */
function generateMockMetaproperties() {
  return {
    "property1": {
      "id": "property1",
      "name": "Department",
      "label": "Department",
      "type": "select",
      "isMultiselect": true,
      "isRequired": false,
      "zindex": 1,
      "isFilterable": true,
      "count": {
        "total": 120
      },
      "options": {
        "option1": {
          "id": "option1",
          "label": "Marketing",
          "zindex": 1,
          "count": 45
        },
        "option2": {
          "id": "option2",
          "label": "Sales",
          "zindex": 2,
          "count": 30
        },
        "option3": {
          "id": "option3",
          "label": "Development",
          "zindex": 3,
          "count": 45
        }
      }
    },
    "property2": {
      "id": "property2",
      "name": "Region",
      "label": "Region",
      "type": "select",
      "isMultiselect": true,
      "isRequired": true,
      "zindex": 2,
      "isFilterable": true,
      "count": {
        "total": 120
      },
      "options": {
        "option1": {
          "id": "option1",
          "label": "North America",
          "zindex": 1,
          "count": 50
        },
        "option2": {
          "id": "option2", 
          "label": "Europe",
          "zindex": 2,
          "count": 40
        },
        "option3": {
          "id": "option3",
          "label": "Asia Pacific",
          "zindex": 3,
          "count": 30
        }
      }
    }
  };
}