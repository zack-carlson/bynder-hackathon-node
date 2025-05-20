# Bynder Media API

A Node.js Express API for interacting with Bynder media assets.

## Description

This API provides a set of endpoints to fetch, search, and export media assets from Bynder. It uses the official Bynder JavaScript SDK for authentication and data retrieval.

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Bynder account with API credentials

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd bynder-hackathon-03
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables
   Create a `.env` file in the root directory with the following variables:

```
BYNDER_BASE_URL=https://your-portal.getbynder.com/api/
BYNDER_CLIENT_ID=your-client-id
BYNDER_CLIENT_SECRET=your-client-secret
BYNDER_REDIRECT_URI=your-redirect-uri
PORT=3000
NODE_ENV=development
USE_MOCK_DATA=true  # Set to false in production
```

4. Start the server

```bash
node index.js
```

## API Endpoints

### Media Routes

Base URL: `/api/media`

#### Get all media items

- **URL**: `/api/media/list`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (optional): Maximum number of media items to retrieve (default: 100, max: 1000)
  - `page` (optional): Page number for pagination (default: 1)
  - `sortBy` (optional): Field to sort by (default: 'dateCreated')
  - `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')
- **Response**: JSON array of media items

#### Get media item by ID

- **URL**: `/api/media/:id`
- **Method**: `GET`
- **URL Parameters**:
  - `id`: Bynder media ID
- **Response**: JSON object containing media item details

#### Export all media to XLSX

- **URL**: `/api/media/exportAllMedia`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (optional): Maximum number of media items to export (default: 1000)
  - `filename` (optional): Custom filename for the export
- **Response**: JSON object with download URL

#### Export meta-properties to XLSX

- **URL**: `/api/media/exportMetaProperties`
- **Method**: `GET`
- **Query Parameters**:
  - `filename` (optional): Custom filename for the export
- **Response**: JSON object with download URL and meta-property counts
- **Description**: Creates an Excel file with two sheets:
  - "Meta Properties" sheet containing all meta-property IDs, names, and their possible values
  - "Property Options" sheet containing all options with their parent property references

#### Download exported file

- **URL**: `/api/media/download/:filename`
- **Method**: `GET`
- **URL Parameters**:
  - `filename`: Name of the file to download
- **Response**: File download

#### Get API Routes

- **URL**: `/api/routes`
- **Method**: `GET`
- **Response**: JSON object with all available API routes and their parameters

## Examples

### Fetch all media items

```bash
curl -X GET http://localhost:3000/api/media/list
```

### Fetch a specific media item

```bash
curl -X GET http://localhost:3000/api/media/0489230A-0978-4CAE-9E93-111DCE61D71A
```

### Export media to XLSX

```bash
curl -X GET "http://localhost:3000/api/media/exportAllMedia?limit=100&filename=my-export.xlsx"
```

### Export meta-properties to XLSX

```bash
curl -X GET "http://localhost:3000/api/media/exportMetaProperties?filename=meta-properties.xlsx"
```

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "timestamp": "2025-05-20T18:17:39.400Z"
}
```
