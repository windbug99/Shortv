import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share, ExternalLink, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Feed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract video ID from URL
  const videoId = window.location.pathname.split("/").pop();

  const { data: videos = [] } = useQuery({
    queryKey: ["/api/videos/feed"],
  });

  const videosArray = Array.isArray(videos) ? videos : [];
  const video = videosArray.find((v: any) => v.id.toString() === videoId);

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/view`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/upvote`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
      toast({
        title: data.upvoted ? "업보트 추가" : "업보트 제거",
        description: data.upvoted ? "영상에 업보트를 추가했습니다." : "영상에서 업보트를 제거했습니다.",
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
        description: "업보트 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

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
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
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
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          피드로 돌아가기
        </Button>

        {/* Video Header */}
        <Card className="mb-8">
          <div className="aspect-video bg-gray-300 rounded-t-xl overflow-hidden">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-500">썸네일 없음</span>
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
                <h3 className="font-medium text-gray-900">{video.channel.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatTimeAgo(video.publishedAt)} • 
                  {video.duration && ` ${video.duration} • `}
                  조회수 {video.viewCount?.toLocaleString() || 0}회
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => upvoteMutation.mutate()}
                  disabled={upvoteMutation.isPending}
                  className={video.userUpvoted ? "text-blue-500" : "text-gray-400"}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">{video.upvoteCount || 0}</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
            <p className="text-gray-600 leading-relaxed">
              {video.aiSummary || "AI 요약이 아직 생성되지 않았습니다."}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Summary */}
        <Card>
          <CardContent className="p-8">
            <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-gray-900 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:p-4 prose-blockquote:rounded-lg">
              {video.detailedSummary ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {video.detailedSummary}
                </ReactMarkdown>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">핵심정리</h2>
                  <p className="text-gray-500">상세한 AI 요약이 아직 생성되지 않았습니다.</p>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4 mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
