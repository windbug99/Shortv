import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["/api/videos/feed"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">홈</h1>
          <p className="text-gray-600">구독한 채널의 최신 영상과 AI 요약을 확인하세요</p>
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
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">홈</h1>
          <p className="text-gray-600">구독한 채널의 최신 영상과 AI 요약을 확인하세요</p>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">구독한 채널이 없거나 새로운 영상이 없습니다.</p>
          <p className="text-sm text-gray-400">
            채널 페이지에서 YouTube 채널을 추가해보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">홈</h1>
        <p className="text-gray-600">구독한 채널의 최신 영상과 AI 요약을 확인하세요</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video: any) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
