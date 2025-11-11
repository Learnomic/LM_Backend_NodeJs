// config/azureStorage.js
import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';

// Azure Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'profile-images';

// Initialize Azure Blob Service Client
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Create container if it doesn't exist
const initializeContainer = async () => {
  try {
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for images
    });
    console.log('Azure Blob Container initialized successfully');
  } catch (error) {
    console.error('Error initializing Azure Blob Container:', error);
  }
};

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Upload file to Azure Blob Storage
const uploadToBlob = async (file, userId) => {
  try {
    const fileName = `profile-${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    // Upload with metadata
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
        blobCacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading to Azure Blob:', error);
    throw error;
  }
};

// Delete file from Azure Blob Storage
const deleteFromBlob = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract blob name from URL
    const blobName = imageUrl.split('/').pop();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
    console.log(`Deleted blob: ${blobName}`);
  } catch (error) {
    console.error('Error deleting from Azure Blob:', error);
  }
};

export { 
  upload, 
  uploadToBlob, 
  deleteFromBlob, 
  initializeContainer 
};