import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_FILE_AGE_HOURS = 2; // Clean files older than 2 hours
const MAX_FILE_SIZE_MB = 50; // Clean files larger than 50MB immediately

export function initializeTempFileCleanup() {
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Run cleanup every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    cleanupTempFiles();
  });

  // Run initial cleanup on startup
  setTimeout(() => {
    cleanupTempFiles();
  }, 5000);

  console.log('Temporary file cleanup service initialized');
}

export function cleanupTempFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      return;
    }

    const files = fs.readdirSync(TEMP_DIR);
    let deletedCount = 0;
    let freedSpace = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        const fileSizeMB = stats.size / (1024 * 1024);
        const fileAgeHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        // Delete if file is too old or too large
        const shouldDelete = fileAgeHours > MAX_FILE_AGE_HOURS || fileSizeMB > MAX_FILE_SIZE_MB;
        
        if (shouldDelete) {
          fs.unlinkSync(filePath);
          deletedCount++;
          freedSpace += fileSizeMB;
          
          console.log(`Cleaned up temp file: ${file} (${fileSizeMB.toFixed(2)}MB, ${fileAgeHours.toFixed(1)}h old)`);
        }
      } catch (fileError) {
        console.warn(`Failed to process temp file ${file}:`, fileError);
      }
    }

    if (deletedCount > 0) {
      console.log(`Temp cleanup completed: ${deletedCount} files removed, ${freedSpace.toFixed(2)}MB freed`);
    }
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
}

export function cleanupVideoFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      return;
    }

    const files = fs.readdirSync(TEMP_DIR);
    let deletedCount = 0;
    let freedSpace = 0;

    // Target video and audio file extensions
    const mediaExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.wmv', '.mp3', '.wav', '.flac'];

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        const fileExtension = path.extname(file).toLowerCase();
        const fileSizeMB = stats.size / (1024 * 1024);
        
        // Delete media files
        if (mediaExtensions.includes(fileExtension)) {
          fs.unlinkSync(filePath);
          deletedCount++;
          freedSpace += fileSizeMB;
          
          console.log(`Cleaned up media file: ${file} (${fileSizeMB.toFixed(2)}MB)`);
        }
      } catch (fileError) {
        console.warn(`Failed to process file ${file}:`, fileError);
      }
    }

    if (deletedCount > 0) {
      console.log(`Media cleanup completed: ${deletedCount} files removed, ${freedSpace.toFixed(2)}MB freed`);
    }
  } catch (error) {
    console.error('Error during media file cleanup:', error);
  }
}