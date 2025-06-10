import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleArrowUp } from "@/components/ui/circle-arrow-up";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface VideoCardProps {
  video: {
    id: number;
    videoId: string;
    title: string;
    thumbnailUrl?: string;
    publishedAt: string;
    viewCount?: number;
    aiSummary?: string;
    upvoteCount: number;
    userUpvoted: boolean;
    channel: {
      id: number;
      name: string;
      thumbnailUrl?: string;
    };
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Check subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/channels", video.channel.id, "subscription"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/channels/${video.channel.id}/subscription`);
      return await response.json();
    },
    enabled: isAuthenticated,
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/channels/${video.channel.id}/subscribe`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", video.channel.id, "subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "구독 완료",
        description: `${video.channel.name} 채널을 구독했습니다.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "채널 구독 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${video.id}/upvote`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/recommended"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "업보트 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${video.id}/view`);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate feed cache to show updated view count
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
    },
  });

  const handleCardClick = () => {
    // Increment view count when navigating to video detail
    incrementViewMutation.mutate();
    setLocation(`/feed/${video.id}`);
  };

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is authenticated before allowing upvote
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "업보트를 하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    upvoteMutation.mutate();
  };

  const handleSubscribe = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is authenticated before allowing subscription
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "채널을 구독하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    subscriptionMutation.mutate();
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const published = new Date(date);
    const diffInHours = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  return (
    <Card 
      className="video-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-300 overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500 text-sm">썸네일 없음</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        {/* Channel Info */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
            {video.channel.thumbnailUrl ? (
              <img
                src={video.channel.thumbnailUrl}
                alt={video.channel.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300" />
            )}
          </div>
          <span className="text-sm text-gray-600 font-medium">{video.channel.name}</span>
          <span className="text-sm text-gray-400">{formatTimeAgo(video.publishedAt)}</span>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
          {video.title}
        </h3>
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>조회수 {video.viewCount?.toLocaleString() || 0}회</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubscribe}
              disabled={subscriptionMutation.isPending || subscriptionData?.subscribed}
              className="justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground !h-[1.8rem] flex items-center space-x-1 px-2 py-0.5 border rounded-md transition-colors border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-[14px]"
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs font-medium">채널추가</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpvote}
              disabled={upvoteMutation.isPending}
              className="justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground !h-[1.8rem] flex items-center space-x-1 px-2 py-0.5 border rounded-md transition-colors border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-[14px]"
            >
              <CircleArrowUp 
                className={`w-3 h-3 ${video.userUpvoted ? "text-red-500" : "text-gray-500"}`}
              />
              <span className="text-xs font-medium">{video.upvoteCount || 0}</span>
            </Button>
          </div>
        </div>
        
        {/* AI Summary */}
        <p className="text-sm text-gray-600 leading-relaxed">
          {video.aiSummary || "AI 요약이 생성 중입니다..."}
        </p>
      </CardContent>
    </Card>
  );
}
