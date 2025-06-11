// Cache management for video processing
interface VideoProcessingCache {
  [videoId: string]: {
    duration?: string;
    transcriptAttempted?: boolean;
    audioAttempted?: boolean;
    lastAttempt?: Date;
  };
}

let videoCache: VideoProcessingCache = {};

export function clearVideoCache(videoId?: string): void {
  if (videoId) {
    delete videoCache[videoId];
    console.log(`Cleared cache for video: ${videoId}`);
  } else {
    videoCache = {};
    console.log('Cleared entire video processing cache');
  }
}

export function clearChannelCache(channelId: string, videoIds: string[]): void {
  let clearedCount = 0;
  for (const videoId of videoIds) {
    if (videoCache[videoId]) {
      delete videoCache[videoId];
      clearedCount++;
    }
  }
  console.log(`Cleared cache for ${clearedCount} videos from channel ${channelId}`);
}

export function getCachedVideoInfo(videoId: string): VideoProcessingCache[string] | undefined {
  return videoCache[videoId];
}

export function setCachedVideoInfo(videoId: string, info: Partial<VideoProcessingCache[string]>): void {
  if (!videoCache[videoId]) {
    videoCache[videoId] = {};
  }
  Object.assign(videoCache[videoId], info);
}

export function shouldSkipVideoProcessing(videoId: string): boolean {
  const cached = videoCache[videoId];
  if (!cached) return false;
  
  // Skip if recently attempted and failed
  if (cached.lastAttempt) {
    const timeSinceAttempt = Date.now() - cached.lastAttempt.getTime();
    if (timeSinceAttempt < 24 * 60 * 60 * 1000) { // 24 hours
      return Boolean(cached.transcriptAttempted) && Boolean(cached.audioAttempted);
    }
  }
  
  return false;
}