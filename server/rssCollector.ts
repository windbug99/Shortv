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
  
  // Schedule to run every hour (but don't run initial collection)
  cron.schedule("0 * * * *", () => {
    console.log("Running scheduled RSS collection...");
    collectAllChannelVideos().catch(error => {
      console.error("Error in scheduled RSS collection:", error);
    });
  });
  
  console.log("RSS collector scheduled successfully");
}

async function handleDeletedChannel(channelId: string, dbChannelId: number) {
  try {
    console.log(`Handling deleted/unavailable channel: ${channelId} (DB ID: ${dbChannelId})`);
    
    // Get channel info for logging
    const channels = await storage.getChannels();
    const channel = channels.find(c => c.id === dbChannelId);
    const channelName = channel?.name || `Channel ${channelId}`;
    
    // Get videos count before deletion
    const videos = await storage.getVideosByChannel(dbChannelId);
    const videoCount = videos.length;
    
    if (videoCount > 0) {
      console.log(`Deleting ${videoCount} videos from removed channel: ${channelName}`);
      await storage.deleteVideosByChannel(dbChannelId);
    }
    
    // Update channel status to indicate it's been deleted
    const cleanChannelName = channelName.replace(/^\[DELETED\]\s*/, '');
    await storage.updateChannel(dbChannelId, { 
      name: `[DELETED] ${cleanChannelName}`,
      lastUpdate: new Date()
    });
    
    console.log(`Successfully cleaned up ${videoCount} videos from deleted channel: ${channelName}`);
  } catch (error) {
    console.error(`Error handling deleted channel ${channelId}:`, error);
  }
}

export async function updateChannelInfo(channelId: string, dbChannelId: number) {
  try {
    // First try to get channel info from YouTube Data API
    let channelInfo: { name?: string; thumbnailUrl?: string } = {};
    
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${process.env.YOUTUBE_API_KEY}`;
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          if (apiData.items && apiData.items.length > 0) {
            const snippet = apiData.items[0].snippet;
            channelInfo = {
              name: snippet.title,
              thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
            };
            console.log(`Fetched channel info from API: ${channelInfo.name}`);
          }
        }
      } catch (apiError) {
        console.warn(`YouTube API failed, falling back to RSS: ${apiError}`);
      }
    }
    
    // Fallback to RSS if API didn't work or no API key
    if (!channelInfo.name) {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const response = await fetch(rssUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const xmlText = await response.text();
      const rssChannelInfo = parseChannelInfo(xmlText);
      channelInfo = rssChannelInfo;
    }
    
    // Update channel info with real data
    if (channelInfo.name || channelInfo.thumbnailUrl) {
      await storage.updateChannel(dbChannelId, {
        name: channelInfo.name,
        thumbnailUrl: channelInfo.thumbnailUrl,
      });
      console.log(`Updated channel info: ${channelInfo.name}`);
    }
    
    return channelInfo;
  } catch (error) {
    console.error(`Error updating channel info for ${channelId}:`, error);
    return {};
  }
}

export async function collectAllChannelVideos() {
  try {
    const channels = await storage.getChannels();
    
    for (const channel of channels) {
      try {
        await collectChannelVideos(channel.channelId, channel.id);
      } catch (error) {
        console.error(`Error collecting videos for channel ${channel.name}:`, error);
        
        // If it's a network error or channel unavailable, try to handle it
        if (error instanceof Error && (
          error.message.includes('404') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('terminated')
        )) {
          console.log(`Attempting to clean up potentially deleted channel: ${channel.name}`);
          await handleDeletedChannel(channel.channelId, channel.id);
        }
      }
    }
  } catch (error) {
    console.error("Error in RSS collection:", error);
  }
}

export async function collectChannelVideos(channelId: string, dbChannelId: number) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    const response = await fetch(rssUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Channel ${channelId} appears to be deleted or unavailable (404). Cleaning up videos...`);
        await handleDeletedChannel(channelId, dbChannelId);
        return;
      }
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Check if the RSS feed indicates the channel is terminated or unavailable
    if (xmlText.includes('This channel does not exist') || 
        xmlText.includes('channel has been terminated') ||
        xmlText.includes('account associated with this channel has been terminated') ||
        xmlText.length < 100) { // Very short response usually indicates an error
      console.log(`Channel ${channelId} appears to be terminated or unavailable. Cleaning up videos...`);
      await handleDeletedChannel(channelId, dbChannelId);
      return;
    }
    
    const videos = parseRSSFeed(xmlText);
    const channelInfo = parseChannelInfo(xmlText);
    
    // Update channel info only if we have better data
    const currentChannel = await storage.getChannels();
    const existingChannel = currentChannel.find(c => c.id === dbChannelId);
    
    const updates: any = {};
    
    // Always update name if available
    if (channelInfo.name) {
      updates.name = channelInfo.name;
    }
    
    // Only update thumbnail if we don't have one or we got a better one from API
    if (channelInfo.thumbnailUrl && (!existingChannel?.thumbnailUrl || 
        !existingChannel.thumbnailUrl.includes('yt3.ggpht.com'))) {
      updates.thumbnailUrl = channelInfo.thumbnailUrl;
    }
    
    if (Object.keys(updates).length > 0) {
      await storage.updateChannel(dbChannelId, updates);
      console.log(`Updated channel info: ${channelInfo.name}`);
    }
    
    for (const video of videos) {
      try {
        // Check if video already exists
        const existingVideo = await storage.getVideoByVideoId(video.videoId);
        if (existingVideo) {
          continue;
        }
        
        // Get actual video duration from YouTube API and filter out short videos
        console.log(`Checking duration for video: ${video.title} (${video.videoId})`);
        const videoDuration = await getVideoDuration(video.videoId);
        
        if (!videoDuration) {
          console.log(`Could not get duration for video: ${video.title}, skipping for safety`);
          continue;
        }
        
        const isShort = isDurationTooShort(videoDuration);
        console.log(`Video ${video.title}: duration=${videoDuration}, isShort=${isShort}`);
        
        if (isShort) {
          console.log(`Skipping short video: ${video.title} (${videoDuration})`);
          continue;
        }
        
        console.log(`Processing video: ${video.title} (${videoDuration})`);
        
        // Generate AI summary with video transcript
        const aiSummary = await generateAISummary(video.title, video.description, "introduction", video.videoId);
        const detailedSummary = await generateAISummary(video.title, video.description, "detailed", video.videoId);
        
        // Save video to database with YouTube API duration
        await storage.createVideo({
          videoId: video.videoId,
          channelId: dbChannelId,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          duration: videoDuration, // Use only YouTube API duration
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

function parseChannelInfo(xmlText: string): { name?: string; thumbnailUrl?: string } {
  try {
    const channelName = extractValue(xmlText, /<title>(.*?)<\/title>/);
    const authorMatch = xmlText.match(/<name>(.*?)<\/name>/);
    const channelThumbnailMatch = xmlText.match(/<media:thumbnail url="(.*?)"/);
    
    return {
      name: channelName ? decodeHtmlEntities(channelName) : undefined,
      thumbnailUrl: channelThumbnailMatch ? channelThumbnailMatch[1] : undefined,
    };
  } catch (error) {
    console.error("Error parsing channel info:", error);
    return {};
  }
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

async function getVideoDuration(videoId: string): Promise<string | null> {
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn(`No YouTube API key available for duration check: ${videoId}`);
    return null;
  }
  
  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.warn(`YouTube API error for ${videoId}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    if (data.items && data.items.length > 0 && data.items[0].contentDetails) {
      const duration = data.items[0].contentDetails.duration;
      console.log(`Got duration for ${videoId}: ${duration}`);
      return duration;
    } else {
      console.warn(`No duration data found for video: ${videoId}`);
      return null;
    }
  } catch (error) {
    console.warn(`Failed to get video duration for ${videoId}:`, error);
    return null;
  }
}

function isDurationTooShort(duration: string): boolean {
  // Parse duration in ISO 8601 format like "PT1M30S" or "PT2M" or "PT45S"
  if (!duration) {
    return false; // Unknown duration, allow it
  }
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return false;
  }
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  return totalSeconds <= 60; // 1 minute or less
}
