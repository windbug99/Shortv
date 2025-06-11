import {
  users,
  channels,
  videos,
  videoUpvotes,
  userChannelSubscriptions,
  type User,
  type UpsertUser,
  type Channel,
  type InsertChannel,
  type Video,
  type InsertVideo,
  type VideoUpvote,
  type InsertVideoUpvote,
  type UserChannelSubscription,
  type InsertUserChannelSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Channel operations
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannels(): Promise<Channel[]>;
  getUserChannels(userId: string): Promise<Channel[]>;
  getChannelByChannelId(channelId: string): Promise<Channel | undefined>;
  updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel>;
  deleteChannel(id: number): Promise<void>;
  getChannelSubscriberCount(channelId: number): Promise<number>;
  deleteChannelCompletely(channelId: number): Promise<void>;

  // Video operations
  createVideo(video: InsertVideo): Promise<Video>;
  getVideos(): Promise<Video[]>;
  getVideosByChannel(channelId: number): Promise<Video[]>;
  getVideoByVideoId(videoId: string): Promise<Video | undefined>;
  updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  deleteVideosByChannel(channelId: number): Promise<void>;

  // Video upvote operations
  getUserVideoUpvote(userId: string, videoId: number): Promise<VideoUpvote | undefined>;
  createVideoUpvote(upvote: InsertVideoUpvote): Promise<VideoUpvote>;
  deleteVideoUpvote(userId: string, videoId: number): Promise<void>;
  getVideoUpvoteCount(videoId: number): Promise<number>;

  // Subscription operations
  subscribeToChannel(subscription: InsertUserChannelSubscription): Promise<UserChannelSubscription>;
  unsubscribeFromChannel(userId: string, channelId: number): Promise<void>;
  getUserSubscriptions(userId: string): Promise<Channel[]>;
  isUserSubscribed(userId: string, channelId: number): Promise<boolean>;

  // Feed operations
  getUserFeed(userId: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>>;
  getRecommendedVideos(userId?: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>>;
  getTrendingVideos(userId?: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Channel operations
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(desc(channels.createdAt));
  }

  async getUserChannels(userId: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.addedBy, userId))
      .orderBy(desc(channels.createdAt));
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.channelId, channelId));
    return channel;
  }

  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel> {
    const [updated] = await db
      .update(channels)
      .set({ ...updates, lastUpdate: new Date() })
      .where(eq(channels.id, id))
      .returning();
    return updated;
  }

  async deleteChannel(id: number): Promise<void> {
    await db.delete(channels).where(eq(channels.id, id));
  }

  async getChannelSubscriberCount(channelId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(userChannelSubscriptions)
      .where(eq(userChannelSubscriptions.channelId, channelId));
    return result[0]?.count || 0;
  }

  async deleteChannelCompletely(channelId: number): Promise<void> {
    // Get video count and video IDs for logging and cache cleanup
    const videosToDelete = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(eq(videos.channelId, channelId));
    
    const videoCount = videosToDelete.length;
    const videoIds = videosToDelete.map(v => v.videoId);
    
    // Delete in correct order to respect foreign key constraints
    
    // 1. Delete video upvotes first
    await db.delete(videoUpvotes).where(
      sql`video_id IN (SELECT id FROM videos WHERE channel_id = ${channelId})`
    );
    
    // 2. Delete videos
    await db.delete(videos).where(eq(videos.channelId, channelId));
    
    // 3. Delete channel subscriptions
    await db.delete(userChannelSubscriptions).where(eq(userChannelSubscriptions.channelId, channelId));
    
    // 4. Finally delete the channel itself
    await db.delete(channels).where(eq(channels.id, channelId));
    
    // 5. Clear video processing cache for all deleted videos
    const { clearChannelCache } = await import('./cacheManager.js');
    clearChannelCache(channelId.toString(), videoIds);
    
    console.log(`Completely deleted channel ${channelId} and all related data (${videoCount} videos removed, cache cleared)`);
  }

  // Video operations
  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.publishedAt));
  }

  async getVideosByChannel(channelId: number): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.channelId, channelId))
      .orderBy(desc(videos.publishedAt));
  }

  async getVideoByVideoId(videoId: string): Promise<Video | undefined> {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.videoId, videoId));
    return video;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video> {
    const [updated] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async deleteVideo(id: number): Promise<void> {
    // Delete video upvotes first
    await db.delete(videoUpvotes).where(eq(videoUpvotes.videoId, id));
    
    // Delete the video
    await db.delete(videos).where(eq(videos.id, id));
  }

  async deleteVideosByChannel(channelId: number): Promise<void> {
    // Delete video upvotes first
    await db.delete(videoUpvotes).where(
      sql`video_id IN (SELECT id FROM videos WHERE channel_id = ${channelId})`
    );
    
    // Delete all videos from the channel
    await db.delete(videos).where(eq(videos.channelId, channelId));
    
    console.log(`Deleted all videos for channel ${channelId}`);
  }

  // Video upvote operations
  async getUserVideoUpvote(userId: string, videoId: number): Promise<VideoUpvote | undefined> {
    const [upvote] = await db
      .select()
      .from(videoUpvotes)
      .where(and(eq(videoUpvotes.userId, userId), eq(videoUpvotes.videoId, videoId)));
    return upvote;
  }

  async createVideoUpvote(upvote: InsertVideoUpvote): Promise<VideoUpvote> {
    const [newUpvote] = await db.insert(videoUpvotes).values(upvote).returning();
    return newUpvote;
  }

  async deleteVideoUpvote(userId: string, videoId: number): Promise<void> {
    await db
      .delete(videoUpvotes)
      .where(and(eq(videoUpvotes.userId, userId), eq(videoUpvotes.videoId, videoId)));
  }

  async getVideoUpvoteCount(videoId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(videoUpvotes)
      .where(eq(videoUpvotes.videoId, videoId));
    return result.count;
  }

  // Subscription operations
  async subscribeToChannel(subscription: InsertUserChannelSubscription): Promise<UserChannelSubscription> {
    const [newSubscription] = await db
      .insert(userChannelSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async unsubscribeFromChannel(userId: string, channelId: number): Promise<void> {
    await db
      .delete(userChannelSubscriptions)
      .where(
        and(
          eq(userChannelSubscriptions.userId, userId),
          eq(userChannelSubscriptions.channelId, channelId)
        )
      );
  }

  async getUserSubscriptions(userId: string): Promise<Channel[]> {
    const result = await db
      .select({
        id: channels.id,
        channelId: channels.channelId,
        name: channels.name,
        description: channels.description,
        thumbnailUrl: channels.thumbnailUrl,
        lastUpdate: channels.lastUpdate,
        createdAt: channels.createdAt,
        addedBy: channels.addedBy,
        // Calculate real statistics
        subscriberCount: sql<number>`(
          SELECT COUNT(*) 
          FROM user_channel_subscriptions 
          WHERE channel_id = ${channels.id}
        )`,
        videoCount: sql<number>`(
          SELECT COUNT(*) 
          FROM videos 
          WHERE channel_id = ${channels.id}
        )`,
        totalViews: sql<number>`(
          SELECT COALESCE(SUM(view_count), 0) 
          FROM videos 
          WHERE channel_id = ${channels.id}
        )`
      })
      .from(userChannelSubscriptions)
      .innerJoin(channels, eq(userChannelSubscriptions.channelId, channels.id))
      .where(eq(userChannelSubscriptions.userId, userId))
      .orderBy(desc(channels.lastUpdate));

    return result as Channel[];
  }

  async isUserSubscribed(userId: string, channelId: number): Promise<boolean> {
    const [subscription] = await db
      .select()
      .from(userChannelSubscriptions)
      .where(
        and(
          eq(userChannelSubscriptions.userId, userId),
          eq(userChannelSubscriptions.channelId, channelId)
        )
      );
    return !!subscription;
  }

  // Feed operations
  async getUserFeed(userId: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>> {
    const result = await db
      .select({
        id: videos.id,
        videoId: videos.videoId,
        channelId: videos.channelId,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        publishedAt: videos.publishedAt,
        duration: videos.duration,
        viewCount: videos.viewCount,
        aiSummary: videos.aiSummary,
        detailedSummary: videos.detailedSummary,
        createdAt: videos.createdAt,
        channel: {
          id: channels.id,
          channelId: channels.channelId,
          name: channels.name,
          description: channels.description,
          thumbnailUrl: channels.thumbnailUrl,
          subscriberCount: channels.subscriberCount,
          videoCount: channels.videoCount,
          totalViews: channels.totalViews,
          lastUpdate: channels.lastUpdate,
          createdAt: channels.createdAt,
          addedBy: channels.addedBy,
        },
        upvoteCount: sql<number>`
          (SELECT COUNT(*) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id})
        `,
        userUpvoted: sql<boolean>`
          EXISTS(
            SELECT 1 FROM ${videoUpvotes} 
            WHERE ${videoUpvotes.videoId} = ${videos.id} 
            AND ${videoUpvotes.userId} = ${userId}
          )
        `,
      })
      .from(videos)
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .innerJoin(userChannelSubscriptions, eq(channels.id, userChannelSubscriptions.channelId))
      .where(eq(userChannelSubscriptions.userId, userId))
      .orderBy(desc(videos.publishedAt));

    return result as Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>;
  }

  async getRecommendedVideos(userId?: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>> {
    const result = await db
      .select({
        id: videos.id,
        videoId: videos.videoId,
        channelId: videos.channelId,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        publishedAt: videos.publishedAt,
        duration: videos.duration,
        viewCount: videos.viewCount,
        aiSummary: videos.aiSummary,
        detailedSummary: videos.detailedSummary,
        createdAt: videos.createdAt,
        channel: {
          id: channels.id,
          channelId: channels.channelId,
          name: channels.name,
          description: channels.description,
          thumbnailUrl: channels.thumbnailUrl,
          subscriberCount: channels.subscriberCount,
          videoCount: channels.videoCount,
          totalViews: channels.totalViews,
          lastUpdate: channels.lastUpdate,
          createdAt: channels.createdAt,
          addedBy: channels.addedBy,
        },
        upvoteCount: sql<number>`
          (SELECT COUNT(*) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id})
        `,
        userUpvoted: sql<boolean>`
          ${userId ? sql`EXISTS(
            SELECT 1 FROM ${videoUpvotes} 
            WHERE ${videoUpvotes.videoId} = ${videos.id} 
            AND ${videoUpvotes.userId} = ${userId}
          )` : sql`FALSE`}
        `,
      })
      .from(videos)
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .where(sql`(SELECT COUNT(*) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id}) >= 1`)
      .orderBy(sql`
        (SELECT MAX(${videoUpvotes.createdAt}) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id}) DESC
      `);

    return result as Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>;
  }

  async getTrendingVideos(userId?: string): Promise<Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>> {
    // Get videos from the last 7 days, ordered by upvote count (desc), then view count (desc)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
      .select({
        id: videos.id,
        videoId: videos.videoId,
        channelId: videos.channelId,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        publishedAt: videos.publishedAt,
        duration: videos.duration,
        viewCount: videos.viewCount,
        aiSummary: videos.aiSummary,
        detailedSummary: videos.detailedSummary,
        createdAt: videos.createdAt,
        channel: {
          id: channels.id,
          channelId: channels.channelId,
          name: channels.name,
          description: channels.description,
          thumbnailUrl: channels.thumbnailUrl,
          subscriberCount: channels.subscriberCount,
          videoCount: channels.videoCount,
          totalViews: channels.totalViews,
          lastUpdate: channels.lastUpdate,
          createdAt: channels.createdAt,
          addedBy: channels.addedBy,
        },
        upvoteCount: sql<number>`
          (SELECT COUNT(*) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id})
        `,
        userUpvoted: sql<boolean>`
          ${userId ? sql`EXISTS(
            SELECT 1 FROM ${videoUpvotes} 
            WHERE ${videoUpvotes.videoId} = ${videos.id} 
            AND ${videoUpvotes.userId} = ${userId}
          )` : sql`FALSE`}
        `,
      })
      .from(videos)
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .where(gte(videos.publishedAt, sevenDaysAgo))
      .orderBy(
        sql`(SELECT COUNT(*) FROM ${videoUpvotes} WHERE ${videoUpvotes.videoId} = ${videos.id}) DESC`,
        desc(videos.viewCount)
      )
      .limit(8);

    return result as Array<Video & { channel: Channel; upvoteCount: number; userUpvoted: boolean }>;
  }
}

export const storage = new DatabaseStorage();
