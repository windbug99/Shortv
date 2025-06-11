import { db } from './db.js';
import { videos, videoUpvotes, userChannelSubscriptions, channels } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

export async function cleanupOrphanedRecords(): Promise<{
  deletedVideos: number;
  deletedUpvotes: number;
  deletedSubscriptions: number;
}> {
  console.log('데이터베이스 고아 레코드 정리 시작...');
  
  // 1. Delete orphaned video upvotes (videos that don't exist)
  const deletedUpvotesResult = await db.execute(sql`
    DELETE FROM video_upvotes 
    WHERE video_id NOT IN (SELECT id FROM videos)
  `);
  
  // 2. Delete orphaned videos (channels that don't exist)
  const deletedVideosResult = await db.execute(sql`
    DELETE FROM videos 
    WHERE channel_id NOT IN (SELECT id FROM channels)
  `);
  
  // 3. Delete orphaned subscriptions (channels that don't exist)
  const deletedSubscriptionsResult = await db.execute(sql`
    DELETE FROM user_channel_subscriptions 
    WHERE channel_id NOT IN (SELECT id FROM channels)
  `);
  
  const result = {
    deletedVideos: deletedVideosResult.rowCount || 0,
    deletedUpvotes: deletedUpvotesResult.rowCount || 0,
    deletedSubscriptions: deletedSubscriptionsResult.rowCount || 0
  };
  
  console.log(`고아 레코드 정리 완료: 영상 ${result.deletedVideos}개, 업보트 ${result.deletedUpvotes}개, 구독 ${result.deletedSubscriptions}개 삭제`);
  
  return result;
}

export async function validateDatabaseIntegrity(): Promise<{
  orphanedVideos: number;
  orphanedUpvotes: number;
  orphanedSubscriptions: number;
}> {
  // Check for orphaned videos
  const orphanedVideosResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM videos 
    WHERE channel_id NOT IN (SELECT id FROM channels)
  `);
  
  // Check for orphaned video upvotes
  const orphanedUpvotesResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM video_upvotes 
    WHERE video_id NOT IN (SELECT id FROM videos)
  `);
  
  // Check for orphaned subscriptions
  const orphanedSubscriptionsResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM user_channel_subscriptions 
    WHERE channel_id NOT IN (SELECT id FROM channels)
  `);
  
  const videosCount = orphanedVideosResult.rows?.[0] as any;
  const upvotesCount = orphanedUpvotesResult.rows?.[0] as any;
  const subscriptionsCount = orphanedSubscriptionsResult.rows?.[0] as any;
  
  return {
    orphanedVideos: parseInt(videosCount?.count || '0'),
    orphanedUpvotes: parseInt(upvotesCount?.count || '0'),
    orphanedSubscriptions: parseInt(subscriptionsCount?.count || '0')
  };
}