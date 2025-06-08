import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertChannelSchema, insertVideoUpvoteSchema } from "@shared/schema";
import { z } from "zod";
import { initializeRSSCollector, updateChannelInfo } from "./rssCollector";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Channel routes
  app.post('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelData = insertChannelSchema.parse({
        ...req.body,
        addedBy: userId,
      });

      // Check if channel already exists
      const existingChannel = await storage.getChannelByChannelId(channelData.channelId);
      if (existingChannel) {
        // Subscribe user to existing channel
        const isSubscribed = await storage.isUserSubscribed(userId, existingChannel.id);
        if (!isSubscribed) {
          await storage.subscribeToChannel({ userId, channelId: existingChannel.id });
        }
        // Update channel info if it doesn't have proper name (async)
        if (!existingChannel.name || existingChannel.name.startsWith("Channel_")) {
          updateChannelInfo(channelData.channelId, existingChannel.id).catch(console.error);
        }
        return res.json(existingChannel);
      }

      // Get channel info from YouTube API immediately for new channels
      let channelName = channelData.name || `Channel_${channelData.channelId}`;
      let thumbnailUrl: string | undefined;
      
      if (process.env.YOUTUBE_API_KEY) {
        try {
          const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelData.channelId}&key=${process.env.YOUTUBE_API_KEY}`;
          const apiResponse = await fetch(apiUrl);
          
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            if (apiData.items && apiData.items.length > 0) {
              const snippet = apiData.items[0].snippet;
              channelName = snippet.title;
              thumbnailUrl = snippet.thumbnails?.high?.url;
            }
          }
        } catch (apiError) {
          console.warn(`YouTube API failed for new channel ${channelData.channelId}:`, apiError);
        }
      }

      // Create new channel with proper YouTube API data
      const channel = await storage.createChannel({
        ...channelData,
        name: channelName,
        thumbnailUrl
      });
      
      // Subscribe user to the new channel
      await storage.subscribeToChannel({ userId, channelId: channel.id });

      // Fallback update if API wasn't available initially
      if (!thumbnailUrl) {
        updateChannelInfo(channelData.channelId, channel.id).catch(console.error);
      }

      res.json(channel);
    } catch (error) {
      console.error("Error creating channel:", error);
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  app.get('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channels = await storage.getUserSubscriptions(userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.delete('/api/channels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelId = parseInt(req.params.id);

      // Unsubscribe user from channel
      await storage.unsubscribeFromChannel(userId, channelId);

      res.json({ message: "Channel removed successfully" });
    } catch (error) {
      console.error("Error removing channel:", error);
      res.status(500).json({ message: "Failed to remove channel" });
    }
  });

  // Video routes
  app.get('/api/videos/feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feed = await storage.getUserFeed(userId);
      res.json(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const videos = await storage.getVideos();
      const video = videos.find(v => v.id === videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Increment view count when video is accessed
      await storage.updateVideo(videoId, { 
        viewCount: (video.viewCount || 0) + 1 
      });

      // Return updated video with new view count
      const updatedVideo = { ...video, viewCount: (video.viewCount || 0) + 1 };
      res.json(updatedVideo);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  // Dedicated endpoint to increment view count
  app.post('/api/videos/:id/view', async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const videos = await storage.getVideos();
      const video = videos.find(v => v.id === videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Increment view count
      const newViewCount = (video.viewCount || 0) + 1;
      await storage.updateVideo(videoId, { viewCount: newViewCount });

      res.json({ viewCount: newViewCount });
    } catch (error) {
      console.error("Error updating view count:", error);
      res.status(500).json({ message: "Failed to update view count" });
    }
  });

  // Video upvote routes
  app.post('/api/videos/:id/upvote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videoId = parseInt(req.params.id);

      const existingUpvote = await storage.getUserVideoUpvote(userId, videoId);
      
      if (existingUpvote) {
        // Remove upvote
        await storage.deleteVideoUpvote(userId, videoId);
        const upvoteCount = await storage.getVideoUpvoteCount(videoId);
        res.json({ upvoted: false, upvoteCount });
      } else {
        // Add upvote
        await storage.createVideoUpvote({ userId, videoId });
        const upvoteCount = await storage.getVideoUpvoteCount(videoId);
        res.json({ upvoted: true, upvoteCount });
      }
    } catch (error) {
      console.error("Error toggling upvote:", error);
      res.status(500).json({ message: "Failed to toggle upvote" });
    }
  });

  // Fix all video durations using YouTube API
  app.post('/api/videos/fix-durations', async (req, res) => {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        return res.status(400).json({ message: "YouTube API key not available" });
      }

      const videos = await storage.getVideos();
      let updated = 0;
      let removed = 0;

      for (const video of videos) {
        try {
          // Get duration from YouTube API
          const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${video.videoId}&key=${process.env.YOUTUBE_API_KEY}`;
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
                  // Remove short videos
                  await storage.updateVideo(video.id, { duration: "DELETED" });
                  console.log(`Marking short video for removal: ${video.title} (${duration})`);
                  removed++;
                } else {
                  // Update with proper duration
                  await storage.updateVideo(video.id, { duration });
                  console.log(`Updated duration for: ${video.title} (${duration})`);
                  updated++;
                }
              }
            } else {
              console.log(`No duration data for video: ${video.title}`);
            }
          } else {
            console.log(`API error for video: ${video.title} - ${response.status}`);
          }
        } catch (error) {
          console.error(`Error processing video ${video.title}:`, error);
        }
      }

      res.json({ 
        message: `Updated ${updated} videos, marked ${removed} short videos for removal`,
        updated,
        removed
      });
    } catch (error) {
      console.error("Error fixing durations:", error);
      res.status(500).json({ message: "Failed to fix durations" });
    }
  });

  // Force update all channels with high-quality YouTube API thumbnails
  app.post('/api/channels/update-all', async (req, res) => {
    try {
      const channels = await storage.getChannels();
      let updated = 0;
      
      for (const channel of channels) {
        if (process.env.YOUTUBE_API_KEY) {
          try {
            const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channel.channelId}&key=${process.env.YOUTUBE_API_KEY}`;
            const apiResponse = await fetch(apiUrl);
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              if (apiData.items && apiData.items.length > 0) {
                const snippet = apiData.items[0].snippet;
                const channelInfo = {
                  name: snippet.title,
                  thumbnailUrl: snippet.thumbnails?.high?.url,
                };
                
                await storage.updateChannel(channel.id, channelInfo);
                console.log(`Updated ${channelInfo.name} with high-quality thumbnail`);
                updated++;
              }
            }
          } catch (apiError) {
            console.warn(`YouTube API failed for ${channel.channelId}:`, apiError);
            // Fallback to RSS update
            await updateChannelInfo(channel.channelId, channel.id);
            updated++;
          }
        } else {
          // No API key, use RSS fallback
          await updateChannelInfo(channel.channelId, channel.id);
          updated++;
        }
      }
      
      res.json({ message: `Updated ${updated} channels with high-quality thumbnails` });
    } catch (error) {
      console.error("Error updating channels:", error);
      res.status(500).json({ message: "Failed to update channels" });
    }
  });

  // Initialize RSS collector (runs every hour)
  initializeRSSCollector();

  const httpServer = createServer(app);
  return httpServer;
}
