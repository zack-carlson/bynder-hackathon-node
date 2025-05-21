import { successResponse, errorResponse } from '../utils/responseUtils.js';
import XLSX from 'xlsx';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(uploadsDir);

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
    property1: {
      id: "property1",
      name: "Department",
      label: "Department",
      type: "select",
      isMultiselect: true,
      isRequired: false,
      zindex: 1,
      isFilterable: true,
      count: {
        total: 120
      },
      options: {
        option1: {
          id: "option1",
          label: "Marketing",
          zindex: 1,
          count: 45
        },
        option2: {
          id: "option2",
          label: "Sales",
          zindex: 2,
          count: 30
        },
        option3: {
          id: "option3",
          label: "Development",
          zindex: 3,
          count: 45
        }
      }
    },
    property2: {
      id: "property2",
      name: "Region",
      label: "Region",
      type: "select",
      isMultiselect: true,
      isRequired: true,
      zindex: 2,
      isFilterable: true,
      count: {
        total: 120
      },
      options: {
        option1: {
          id: "option1",
          label: "North America",
          zindex: 1,
          count: 50
        },
        option2: {
          id: "option2", 
          label: "Europe",
          zindex: 2,
          count: 40
        },
        option3: {
          id: "option3",
          label: "Asia Pacific",
          zindex: 3,
          count: 30
        }
      }
    }
  };
}

/**
 * Export all metaproperties and their options to XLSX
 * @param {Object} bynderInstance - Initialized Bynder SDK instance
 * @returns {Function} Express middleware function
 */
export const exportAllMetaProperties = (bynderInstance) => {
  return async (req, res) => {
    try {
      // Extract domain from the base URL and slugify it for the filename
      const bynderDomain = process.env.BYNDER_DOMAIN || 'default';
      const instanceSlug = slugifyDomain(bynderDomain);
      
      // Format: <<export-type>>-<<instance>>-<<timestamp>>.xlsx
      const defaultFilename = `metaproperties-${instanceSlug}-${Date.now()}.xlsx`;
      
      const { filename = defaultFilename } = req.query;

      // Log the export request
      console.log(`Starting full metaproperties export`);

      // Check if Bynder instance is available
      if (!bynderInstance) {
        throw new Error('Bynder SDK not initialized correctly');
      }

      // For development with mock data
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
        const mockData = generateMockMetaproperties();
        const filePath = await createMetaPropertiesXLSX(mockData, filename);
        
        // Generate download URL
        const downloadUrl = `/api/media/download/${path.basename(filePath)}`;
        
        return res.status(200).json(
          successResponse({
            propertiesCount: Object.keys(mockData).length,
            downloadUrl: downloadUrl,
            filename: path.basename(filePath)
          }, 'Metaproperties export completed successfully')
        );
      }
      
      // Fetch all metaproperties from Bynder
      console.log('Fetching metaproperties from Bynder...');
      
      // Default to options=1 to include options and count=1 for property counts
      const options = 1;
      const count = 1;
      
      // Call Bynder API to get metaproperties
      const metaproperties = await bynderInstance.getMetaproperties({ options, count });
      
      if (!metaproperties || Object.keys(metaproperties).length === 0) {
        return res.status(404).json(
          successResponse(null, 'No metaproperties found to export')
        );
      }
      
      console.log(`Retrieved ${Object.keys(metaproperties).length} metaproperties`);
      
      // Convert to XLSX and save file
      console.log('Converting to XLSX format...');
      const filePath = await createMetaPropertiesXLSX(metaproperties, filename);
      console.log(`XLSX file created at: ${filePath}`);

      // Generate download URL
      const downloadUrl = `/api/media/download/${path.basename(filePath)}`;

      // Return success with download URL
      return res.status(200).json(
        successResponse({
          propertiesCount: Object.keys(metaproperties).length,
          downloadUrl: downloadUrl,
          filename: path.basename(filePath)
        }, 'Metaproperties export completed successfully')
      );
    } catch (error) {
      console.error('Error exporting metaproperties:', error);
      const { response, statusCode } = errorResponse(
        error.message || 'Failed to export metaproperty data',
        'METAPROPERTY_EXPORT_ERROR',
        500,
        error
      );
      return res.status(statusCode).json(response);
    }
  };
};

/**
 * Create XLSX file for metaproperties and options
 * @param {Object} metaproperties - Object of metaproperties from Bynder
 * @param {String} filename - Output filename
 * @returns {Promise<String>} Path to the created file
 */
async function createMetaPropertiesXLSX(metaproperties, filename) {
  try {
    // Transform metaproperties to tabular format for first sheet
    const metapropertiesData = [];
    const optionsData = [];
    
    // Process each metaproperty
    Object.keys(metaproperties).forEach(key => {
      const property = metaproperties[key];
      
      // Add to metaproperties sheet
      metapropertiesData.push({
        'ID': property.id || key,
        'Name': property.name || key,
        'Label': property.label || property.name || key,
        'Type': property.type || '',
        'IsMultiselect': property.isMultiselect ? 'Yes' : 'No',
        'IsRequired': property.isRequired ? 'Yes' : 'No',
        'IsFilterable': property.isFilterable ? 'Yes' : 'No',
        'ZIndex': property.zindex || '',
        'Total Count': property.count?.total || ''
      });
      
      // Process options if they exist
      if (property.options) {
        Object.keys(property.options).forEach(optionKey => {
          const option = property.options[optionKey];
          
          // Add to options sheet with reference to parent property
          optionsData.push({
            'ID': option.id || optionKey,
            'Label': option.label || optionKey,
            'ZIndex': option.zindex || '',
            'Count': option.count || '',
            'Metaproperty Name': property.name || key,  // Reference to the parent property
            'Metaproperty ID': property.id || key
          });
        });
      }
    });
    
    // Create workbook with two sheets
    const workbook = XLSX.utils.book_new();
    
    // Add metaproperties sheet
    const propertiesSheet = XLSX.utils.json_to_sheet(metapropertiesData);
    XLSX.utils.book_append_sheet(workbook, propertiesSheet, 'Metaproperties');
    
    // Add options sheet
    const optionsSheet = XLSX.utils.json_to_sheet(optionsData);
    XLSX.utils.book_append_sheet(workbook, optionsSheet, 'Metaproperty Options');
    
    // Auto-size columns for metaproperties sheet
    const propColWidths = metapropertiesData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const cellValue = String(row[key] || '');
        acc[key] = Math.max(acc[key] || 0, Math.min(cellValue.length, 50));
      });
      return acc;
    }, {});
    
    // Auto-size columns for options sheet
    const optColWidths = optionsData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const cellValue = String(row[key] || '');
        acc[key] = Math.max(acc[key] || 0, Math.min(cellValue.length, 50));
      });
      return acc;
    }, {});
    
    // Set column widths for metaproperties sheet
    propertiesSheet['!cols'] = Object.keys(propColWidths).map(key => ({ wch: propColWidths[key] + 2 }));
    
    // Set column widths for options sheet
    optionsSheet['!cols'] = Object.keys(optColWidths).map(key => ({ wch: optColWidths[key] + 2 }));
    
    // Create the file path
    const filePath = path.join(uploadsDir, filename);
    
    // Write to file
    XLSX.writeFile(workbook, filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error creating metaproperties XLSX file:', error);
    throw error;
  }
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