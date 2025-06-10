import { useQuery, useMutation } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function UserFeed() {
  const { toast } = useToast();
  const { data: videos, isLoading } = useQuery({
    queryKey: ["/api/videos/feed"],
  });

  const collectVideosMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/videos/collect");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
      toast({
        title: "영상 수집 완료",
        description: "새로운 영상을 수집했습니다.",
      });
    },
    onError: () => {
      toast({
        title: "수집 실패",
        description: "영상 수집 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">피드</h1>
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

  const videosArray = Array.isArray(videos) ? videos : [];

  if (!videos || videosArray.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">피드</h1>
            <p className="text-gray-600">구독한 채널의 최신 영상과 AI 요약을 확인하세요</p>
          </div>
          <Button
            onClick={() => collectVideosMutation.mutate()}
            disabled={collectVideosMutation.isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${collectVideosMutation.isPending ? 'animate-spin' : ''}`} />
            영상 수집
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">구독한 채널이 없거나 새로운 영상이 없습니다.</p>
          <p className="text-sm text-gray-400">
            채널 페이지에서 YouTube 채널을 추가하거나 위의 "영상 수집" 버튼을 눌러 최신 영상을 확인해보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">피드</h1>
          <p className="text-gray-600">구독한 채널의 최신 영상과 AI 요약을 확인하세요</p>
        </div>
        <Button
          onClick={() => collectVideosMutation.mutate()}
          disabled={collectVideosMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${collectVideosMutation.isPending ? 'animate-spin' : ''}`} />
          영상 수집
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videosArray.map((video: any) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}