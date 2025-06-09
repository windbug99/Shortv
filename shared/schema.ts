import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// YouTube channels table
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url"),
  subscriberCount: integer("subscriber_count").default(0),
  videoCount: integer("video_count").default(0),
  totalViews: integer("total_views").default(0),
  lastUpdate: timestamp("last_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  addedBy: varchar("added_by").notNull(),
});

// Videos table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  videoId: varchar("video_id").notNull().unique(),
  channelId: integer("channel_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url"),
  publishedAt: timestamp("published_at").notNull(),
  duration: varchar("duration"),
  viewCount: integer("view_count").default(0),
  aiSummary: text("ai_summary"),
  detailedSummary: text("detailed_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video upvotes table
export const videoUpvotes = pgTable("video_upvotes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User channel subscriptions table
export const userChannelSubscriptions = pgTable("user_channel_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  channelId: integer("channel_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const channelsRelations = relations(channels, ({ many, one }) => ({
  videos: many(videos),
  subscriptions: many(userChannelSubscriptions),
  addedByUser: one(users, {
    fields: [channels.addedBy],
    references: [users.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  channel: one(channels, {
    fields: [videos.channelId],
    references: [channels.id],
  }),
  upvotes: many(videoUpvotes),
}));

export const videoUpvotesRelations = relations(videoUpvotes, ({ one }) => ({
  video: one(videos, {
    fields: [videoUpvotes.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [videoUpvotes.userId],
    references: [users.id],
  }),
}));

export const userChannelSubscriptionsRelations = relations(
  userChannelSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [userChannelSubscriptions.userId],
      references: [users.id],
    }),
    channel: one(channels, {
      fields: [userChannelSubscriptions.channelId],
      references: [channels.id],
    }),
  })
);

// Insert schemas
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertVideoUpvoteSchema = createInsertSchema(videoUpvotes).omit({
  id: true,
  createdAt: true,
});

export const insertUserChannelSubscriptionSchema = createInsertSchema(
  userChannelSubscriptions
).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type VideoUpvote = typeof videoUpvotes.$inferSelect;
export type InsertVideoUpvote = z.infer<typeof insertVideoUpvoteSchema>;
export type UserChannelSubscription = typeof userChannelSubscriptions.$inferSelect;
export type InsertUserChannelSubscription = z.infer<typeof insertUserChannelSubscriptionSchema>;
