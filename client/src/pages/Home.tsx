import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['/api/videos/recommended'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">추천 영상</h1>
          <p className="text-gray-600">커뮤니티에서 가장 인기 있는 영상들을 확인하세요</p>
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

  const videoList = Array.isArray(videos) ? videos : [];

  if (videoList.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">추천 영상</h1>
          <p className="text-gray-600">커뮤니티에서 가장 인기 있는 영상들을 확인하세요</p>
        </div>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">아직 추천 영상이 없습니다</h3>
          <p className="text-gray-500">
            업보트를 받은 영상들이 여기에 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">추천 영상</h1>
        <p className="text-gray-600">커뮤니티에서 가장 인기 있는 영상들을 확인하세요</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videoList.map((video: any) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
