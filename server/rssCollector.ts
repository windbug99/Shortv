import { storage } from "./storage";
import { generateAISummary } from "./aiSummarizer";
import * as cron from "node-cron";

interface RSSVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Date;
  duration: string;
}

export function initializeRSSCollector() {
  console.log("Initializing RSS collector...");
  
  // Run immediately on startup
  collectAllChannelVideos();
  
  // Schedule to run every hour
  cron.schedule("0 * * * *", () => {
    console.log("Running scheduled RSS collection...");
    collectAllChannelVideos();
  });
}

async function collectAllChannelVideos() {
  try {
    const channels = await storage.getChannels();
    
    for (const channel of channels) {
      try {
        await collectChannelVideos(channel.channelId, channel.id);
      } catch (error) {
        console.error(`Error collecting videos for channel ${channel.name}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in RSS collection:", error);
  }
}

async function collectChannelVideos(channelId: string, dbChannelId: number) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const videos = parseRSSFeed(xmlText);
    
    for (const video of videos) {
      try {
        // Check if video already exists
        const existingVideo = await storage.getVideoByVideoId(video.videoId);
        if (existingVideo) {
          continue;
        }
        
        // Check video duration (skip if 1 minute or less)
        if (isDurationTooShort(video.duration)) {
          continue;
        }
        
        // Generate AI summary
        const aiSummary = await generateAISummary(video.title, video.description, "introduction");
        const detailedSummary = await generateAISummary(video.title, video.description, "detailed");
        
        // Save video to database
        await storage.createVideo({
          videoId: video.videoId,
          channelId: dbChannelId,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          duration: video.duration,
          viewCount: 0,
          aiSummary,
          detailedSummary,
        });
        
        console.log(`Added video: ${video.title}`);
      } catch (error) {
        console.error(`Error processing video ${video.title}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error collecting channel videos for ${channelId}:`, error);
  }
}

function parseRSSFeed(xmlText: string): RSSVideo[] {
  const videos: RSSVideo[] = [];
  
  try {
    // Simple XML parsing for YouTube RSS feeds
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryContent = match[1];
      
      const videoId = extractValue(entryContent, /<yt:videoId>(.*?)<\/yt:videoId>/);
      const title = extractValue(entryContent, /<title>(.*?)<\/title>/);
      const published = extractValue(entryContent, /<published>(.*?)<\/published>/);
      const description = extractValue(entryContent, /<media:description>(.*?)<\/media:description>/) || "";
      const thumbnailMatch = entryContent.match(/<media:thumbnail url="(.*?)"/);
      const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : "";
      
      if (videoId && title && published) {
        videos.push({
          videoId,
          title: decodeHtmlEntities(title),
          description: decodeHtmlEntities(description),
          thumbnailUrl,
          publishedAt: new Date(published),
          duration: "00:00", // Will be updated with actual duration if available
        });
      }
    }
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
  }
  
  return videos;
}

function extractValue(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match ? match[1] : "";
}

function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

function isDurationTooShort(duration: string): boolean {
  // Parse duration in format like "PT1M30S" or "PT2M"
  if (!duration || duration === "00:00") {
    return false; // Unknown duration, allow it
  }
  
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return false;
  }
  
  const minutes = parseInt(match[1] || "0");
  const seconds = parseInt(match[2] || "0");
  const totalSeconds = minutes * 60 + seconds;
  
  return totalSeconds <= 60; // 1 minute or less
}
