import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ChannelCardProps {
  channel: {
    id: number;
    channelId: string;
    name: string;
    thumbnailUrl?: string;
    subscriberCount?: number;
    videoCount?: number;
    totalViews?: number;
    lastUpdate?: string;
  };
  onDelete: () => void;
  isDeleting: boolean;
}

export default function ChannelCard({ channel, onDelete, isDeleting }: ChannelCardProps) {
  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const updated = new Date(date);
    const diffInHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
            {channel.thumbnailUrl ? (
              <img
                src={channel.thumbnailUrl}
                alt={channel.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-1">{channel.name}</h3>
        <p className="truncate text-[12px] mt-[4px] mb-[4px] font-normal text-[#a0a6b8]">{channel.channelId}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">구독자</span>
            <span className="font-medium">{formatNumber(channel.subscriberCount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">수집된 영상</span>
            <span className="font-medium">{channel.videoCount || 0}개</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">총 조회수</span>
            <span className="font-medium">{formatNumber(channel.totalViews)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">마지막 업데이트</span>
            <span className="font-medium">
              {channel.lastUpdate ? formatTimeAgo(channel.lastUpdate) : "없음"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
