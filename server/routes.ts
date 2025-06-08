import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertChannelSchema, insertVideoUpvoteSchema } from "@shared/schema";
import { z } from "zod";
import { initializeRSSCollector } from "./rssCollector";

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
        return res.json(existingChannel);
      }

      // Create new channel
      const channel = await storage.createChannel(channelData);
      
      // Subscribe user to the new channel
      await storage.subscribeToChannel({ userId, channelId: channel.id });

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

      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
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

  // Initialize RSS collector (runs every hour)
  initializeRSSCollector();

  const httpServer = createServer(app);
  return httpServer;
}
