import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/hooks/useAuth";

export default function NewHome() {
  const { user } = useAuth();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['/api/videos/recommended'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading recommended videos...</div>
        </div>
      </div>
    );
  }

  const videoList = Array.isArray(videos) ? videos : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recommended Videos</h1>
        <p className="text-muted-foreground">
          Discover the most upvoted videos from our community
        </p>
      </div>

      {videoList.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No recommended videos yet</h3>
          <p className="text-muted-foreground">
            Videos with upvotes will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {videoList.map((video: any) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}