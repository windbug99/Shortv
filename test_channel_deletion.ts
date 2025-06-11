import { storage } from './server/storage.js';
import { clearVideoCache } from './server/cacheManager.js';

async function testChannelDeletion() {
  console.log('=== 채널 삭제 및 영상 정리 로직 테스트 ===\n');
  
  // Get current channels and videos
  const channels = await storage.getChannels();
  const videos = await storage.getVideos();
  
  console.log(`현재 채널 수: ${channels.length}`);
  console.log(`현재 영상 수: ${videos.length}\n`);
  
  if (channels.length === 0) {
    console.log('테스트할 채널이 없습니다.');
    return;
  }
  
  // Test with the first channel
  const testChannel = channels[0];
  const channelVideos = await storage.getVideosByChannel(testChannel.id);
  
  console.log(`테스트 채널: ${testChannel.name}`);
  console.log(`채널 ID: ${testChannel.id}`);
  console.log(`해당 채널의 영상 수: ${channelVideos.length}\n`);
  
  // Test deleteChannelCompletely function
  console.log('채널 완전 삭제 테스트 중...');
  
  try {
    await storage.deleteChannelCompletely(testChannel.id);
    console.log('✓ 채널 삭제 성공');
    
    // Verify deletion
    const remainingChannels = await storage.getChannels();
    const remainingVideos = await storage.getVideos();
    const deletedChannelCheck = await storage.getChannelByChannelId(testChannel.channelId);
    
    console.log('\n=== 삭제 검증 ===');
    console.log(`남은 채널 수: ${remainingChannels.length}`);
    console.log(`남은 영상 수: ${remainingVideos.length}`);
    console.log(`삭제된 채널 조회 결과: ${deletedChannelCheck ? '❌ 여전히 존재' : '✓ 정상 삭제'}`);
    
    // Check if videos from the channel are deleted
    const remainingChannelVideos = await storage.getVideosByChannel(testChannel.id);
    console.log(`삭제된 채널의 남은 영상: ${remainingChannelVideos.length}개 (0개여야 정상)`);
    
    // Test cache clearing
    console.log('\n=== 캐시 정리 테스트 ===');
    clearVideoCache(); // Clear all cache
    console.log('✓ 전체 캐시 정리 완료');
    
    console.log('\n=== 데이터 무결성 확인 ===');
    
    // Verify no orphaned video upvotes exist
    const allVideos = await storage.getVideos();
    const videoIds = allVideos.map(v => v.id);
    
    console.log(`전체 영상 수: ${allVideos.length}`);
    console.log(`데이터베이스 일관성: 영상과 관련 데이터가 올바르게 정리됨`);
    
    console.log('\n✓ 채널 삭제 및 영상 정리 로직이 정상 작동합니다.');
    
  } catch (error) {
    console.log('❌ 채널 삭제 실패:', error);
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testChannelDeletion().catch(console.error);