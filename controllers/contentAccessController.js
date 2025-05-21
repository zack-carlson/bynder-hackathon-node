import { successResponse, errorResponse } from '../utils/responseUtils.js';
import 'dotenv/config';
import fetch from 'node-fetch';

// Get the base URL from environment variables
const BYNDER_BASE_URL = process.env.BYNDER_BASE_URL || "https://portal.getbynder.com";

/**
 * Get a list of metaproperties via content access
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

      console.log('Fetching metaproperties from content access API...');
      
      // Get the token using the correct path with safety checks
      const token = bynderInstance?.api?.token?.token?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated with Bynder or could not retrieve token');
      }
      
      // Construct the full URL with query parameters
      let url = new URL('/api/content_access/metaproperties', BYNDER_BASE_URL);
      
      // Add query parameters if any
      Object.keys(req.query).forEach(key => {
        url.searchParams.append(key, req.query[key]);
      });
      
      // Make the API request using fetch
      console.log(url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if request was successful
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Return success with data
      return res.status(200).json(
        successResponse(data, 'Content access metaproperties retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting content access metaproperties:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve content access metaproperties',
        'CONTENT_ACCESS_METAPROPERTY_LIST_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Get a single metaproperty by ID via content access
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const getMetapropertyById = (bynderInstance) => {
  return async (req, res) => {
    console.log(bynderInstance.api.token.token.access_token);
    try {
      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      const { id } = req.params;
      console.log(`Fetching metaproperty ${id} from content access API...`);
      
      // Get the token using the correct path with safety checks
      const token = bynderInstance?.api?.token?.token?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated with Bynder or could not retrieve token');
      }
      
      // Construct the full URL with query parameters
      let url = new URL(`/api/content_access/metaproperties/${id}`, BYNDER_BASE_URL);
      
      // Add query parameters if any
      Object.keys(req.query).forEach(key => {
        url.searchParams.append(key, req.query[key]);
      });
      
      // Make the API request using fetch
      console.log(url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if request was successful
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Return success with data
      return res.status(200).json(
        successResponse(data, 'Content access metaproperty retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting content access metaproperty:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to retrieve content access metaproperty',
        'CONTENT_ACCESS_METAPROPERTY_GET_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};