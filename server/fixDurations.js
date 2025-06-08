// Script to fix video durations using YouTube Data API
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

async function fixVideoDurations() {
  if (!process.env.DATABASE_URL || !process.env.YOUTUBE_API_KEY) {
    console.error('Missing required environment variables');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get all videos with invalid durations
    const result = await pool.query('SELECT id, video_id, title FROM videos WHERE duration = $1 OR duration IS NULL', ['00:00']);
    const videos = result.rows;
    
    console.log(`Found ${videos.length} videos with invalid durations`);
    
    let updated = 0;
    let removed = 0;
    
    for (const video of videos) {
      try {
        // Get duration from YouTube API
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${video.video_id}&key=${process.env.YOUTUBE_API_KEY}`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0 && data.items[0].contentDetails) {
            const duration = data.items[0].contentDetails.duration;
            
            // Parse duration to check if it's too short
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
              const hours = parseInt(match[1] || "0");
              const minutes = parseInt(match[2] || "0");
              const seconds = parseInt(match[3] || "0");
              const totalSeconds = hours * 3600 + minutes * 60 + seconds;
              
              if (totalSeconds <= 60) {
                // Delete short videos
                await pool.query('DELETE FROM videos WHERE id = $1', [video.id]);
                console.log(`Removed short video: ${video.title} (${duration})`);
                removed++;
              } else {
                // Update with proper duration
                await pool.query('UPDATE videos SET duration = $1 WHERE id = $2', [duration, video.id]);
                console.log(`Updated duration for: ${video.title} (${duration})`);
                updated++;
              }
            }
          } else {
            // Video not found on YouTube, remove it
            await pool.query('DELETE FROM videos WHERE id = $1', [video.id]);
            console.log(`Removed unavailable video: ${video.title}`);
            removed++;
          }
        } else {
          console.log(`API error for video: ${video.title} - ${response.status}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing video ${video.title}:`, error);
      }
    }
    
    console.log(`\nComplete! Updated ${updated} videos, removed ${removed} short/invalid videos`);
  } catch (error) {
    console.error('Error fixing durations:', error);
  } finally {
    await pool.end();
  }
}

fixVideoDurations();