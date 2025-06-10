import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share, ExternalLink, Plus } from "lucide-react";
import { CircleArrowUp } from "@/components/ui/circle-arrow-up";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDuration } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Feed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Extract video ID from URL
  const videoId = window.location.pathname.split("/").pop();

  // Try to get video from user feed first (if authenticated)
  const { data: userVideos = [] } = useQuery({
    queryKey: ["/api/videos/feed"],
    enabled: isAuthenticated,
  });

  // Also get recommended videos (always available)
  const { data: recommendedVideos = [] } = useQuery({
    queryKey: ["/api/videos/recommended"],
  });

  // Combine videos from both sources and find the video
  const userVideosArray = Array.isArray(userVideos) ? userVideos : [];
  const recommendedVideosArray = Array.isArray(recommendedVideos) ? recommendedVideos : [];
  const allVideos = [...userVideosArray, ...recommendedVideosArray];
  
  // Remove duplicates by video ID
  const uniqueVideos = allVideos.filter((video, index, self) => 
    index === self.findIndex((v) => v.id === video.id)
  );
  
  const video = uniqueVideos.find((v: any) => v.id.toString() === videoId);

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/view`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
    },
  });

  // Check subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/channels", video?.channel.id, "subscription"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/channels/${video?.channel.id}/subscription`);
      return await response.json();
    },
    enabled: isAuthenticated && !!video?.channel.id,
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/channels/${video?.channel.id}/subscribe`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", video?.channel.id, "subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "구독 완료",
        description: `${video?.channel.name} 채널을 구독했습니다.`,
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
      const response = await apiRequest("POST", `/api/videos/${videoId}/upvote`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/recommended"] });
      toast({
        title: data.upvoted ? "업보트 추가" : "업보트 제거",
        description: data.upvoted ? "영상에 업보트를 추가했습니다." : "영상에서 업보트를 제거했습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "오류",
        description: "업보트 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleUpvote = () => {
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

  const handleSubscribe = () => {
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

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  // Increment view count when page loads
  useEffect(() => {
    if (videoId && video) {
      incrementViewMutation.mutate();
    }
  }, [videoId, video?.id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "링크 복사됨",
        description: "링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  const handleOpenOriginal = () => {
    if (video?.videoId) {
      window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank");
    }
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

  if (!video) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <p className="text-gray-500">영상을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>

        {/* Video Header */}
        <Card className="mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="aspect-video bg-gray-300 dark:bg-gray-600 rounded-t-xl overflow-hidden">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">썸네일 없음</span>
              </div>
            )}
          </div>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
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
              <div className="flex-1">
                <h3 className="font-medium text-[#101827] dark:text-gray-300">{video.channel.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(video.publishedAt)} • 
                  {video.duration && ` ${formatDuration(video.duration)} • `}
                  조회수 {video.viewCount?.toLocaleString() || 0}회
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={subscriptionMutation.isPending || subscriptionData?.subscribed}
                  className="flex items-center space-x-1 px-3 py-1.5 border rounded-md transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">채널추가</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpvote}
                  disabled={upvoteMutation.isPending}
                  className={`flex items-center space-x-1 px-3 py-1.5 border rounded-md transition-colors ${
                    video.userUpvoted 
                      ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30" 
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <CircleArrowUp 
                    className={`w-4 h-4 ${video.userUpvoted ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <span className="text-sm font-medium">{video.upvoteCount || 0}</span>
                </Button>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-[#101827] dark:text-gray-100">{video.title}</h1>
            <p className="text-gray-600 dark:text-[#FAFAFA] leading-relaxed">
              {video.aiSummary || "AI 요약이 아직 생성되지 않았습니다."}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Summary */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-8">
            <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 dark:prose-headings:text-[#FAFAFA] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-gray-900 dark:prose-strong:text-[#FAFAFA] prose-p:text-gray-700 dark:prose-p:text-[#FAFAFA] prose-li:text-gray-700 dark:prose-li:text-[#FAFAFA] prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:p-4 prose-blockquote:rounded-lg">
              {video.detailedSummary ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {video.detailedSummary}
                </ReactMarkdown>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-[#FAFAFA] mb-6">핵심정리</h2>
                  <p className="text-gray-500 dark:text-[#FAFAFA]">상세한 AI 요약이 아직 생성되지 않았습니다.</p>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  뒤로가기
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleShare}
                >
                  <Share className="w-4 h-4 mr-2" />
                  공유
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleOpenOriginal}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  YouTube에서 보기
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={subscriptionMutation.isPending || subscriptionData?.subscribed}
                  className="flex items-center space-x-1 px-3 py-1.5 border rounded-md transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">채널추가</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpvote}
                  disabled={upvoteMutation.isPending}
                  className={`flex items-center space-x-1 px-3 py-1.5 border rounded-md transition-colors ${
                    video.userUpvoted 
                      ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30" 
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <CircleArrowUp 
                    className={`w-4 h-4 ${video.userUpvoted ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <span className="text-sm font-medium">{video.upvoteCount || 0}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
