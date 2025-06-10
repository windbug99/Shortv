import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [trendingStartIndex, setTrendingStartIndex] = useState(0);
  
  const { data: trendingVideos, isLoading: trendingLoading } = useQuery({
    queryKey: ['/api/videos/trending'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: videos, isLoading } = useQuery({
    queryKey: ['/api/videos/recommended'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const trendingVideoList = Array.isArray(trendingVideos) ? trendingVideos : [];
  const videoList = Array.isArray(videos) ? videos : [];

  const handleTrendingSlide = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setTrendingStartIndex(Math.max(0, trendingStartIndex - 4));
    } else {
      setTrendingStartIndex(Math.min(Math.max(0, trendingVideoList.length - 4), trendingStartIndex + 4));
    }
  };

  const canSlideLeft = trendingStartIndex > 0;
  const canSlideRight = trendingStartIndex + 4 < trendingVideoList.length;
  const showSlideButtons = trendingVideoList.length > 4;

  if (isLoading || trendingLoading) {
    return (
      <div className="p-6 space-y-12">
        {/* Trending section skeleton */}
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">트랜딩</h1>
            <p className="text-gray-600">최근 인기있는 영상들을 확인하세요</p>
          </div>
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended section skeleton */}
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">추천 영상</h1>
            <p className="text-gray-600">최근 등록된 영상들을 확인하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12">
      {/* Trending Section */}
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">트랜딩</h1>
          <p className="text-gray-600">최근 인기있는 영상들을 확인하세요</p>
        </div>
        
        <div className="relative">
          {/* Video grid with same width as recommended section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => {
              const videoIndex = trendingStartIndex + i;
              const video = trendingVideoList[videoIndex];
              
              return (
                <div key={i} className="h-[450px] flex relative">
                  {video ? (
                    <div className="w-full">
                      <VideoCard video={video} />
                    </div>
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                      <p className="text-gray-400 text-sm">빈 슬롯</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Left slide button - hidden when disabled */}
          {showSlideButtons && canSlideLeft && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-5 top-1/2 -translate-y-1/2 z-10 shadow-lg hover:shadow-xl border-0"
              style={{ backgroundColor: '#0F0504' }}
              onClick={() => handleTrendingSlide('left')}
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </Button>
          )}

          {/* Right slide button - hidden when disabled */}
          {showSlideButtons && canSlideRight && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-5 top-1/2 -translate-y-1/2 z-10 shadow-lg hover:shadow-xl border-0"
              style={{ backgroundColor: '#0F0504' }}
              onClick={() => handleTrendingSlide('right')}
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </Button>
          )}
        </div>
      </div>

      {/* Recommended Section */}
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">추천 영상</h1>
          <p className="text-gray-600">최근 등록된 영상들을 확인하세요</p>
        </div>
        
        {videoList.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">아직 추천 영상이 없습니다</h3>
            <p className="text-gray-500">
              업보트를 받은 영상들이 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videoList.map((video: any) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
