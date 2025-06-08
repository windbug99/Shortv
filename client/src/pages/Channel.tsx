import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChannelCard from "@/components/ChannelCard";
import AddChannelModal from "@/components/AddChannelModal";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Channel() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: channels, isLoading } = useQuery({
    queryKey: ["/api/channels"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (channelId: number) => {
      await apiRequest("DELETE", `/api/channels/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "성공",
        description: "채널이 성공적으로 제거되었습니다.",
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
        description: "채널 제거 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteChannel = (channelId: number, channelName: string) => {
    if (confirm(`'${channelName}' 채널을 구독 해제하시겠습니까?`)) {
      deleteMutation.mutate(channelId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">채널 관리</h1>
            <p className="text-gray-600">구독 중인 YouTube 채널을 관리하세요</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 border rounded-xl space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">채널 관리</h1>
          <p className="text-gray-600">구독 중인 YouTube 채널을 관리하세요</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          채널 추가
        </Button>
      </div>
      
      {!channels || channels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">구독 중인 채널이 없습니다.</p>
          <p className="text-sm text-gray-400 mb-6">
            YouTube 채널을 추가하여 AI 요약 피드를 시작해보세요.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            첫 번째 채널 추가하기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel: any) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDelete={() => handleDeleteChannel(channel.id, channel.name)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      <AddChannelModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
}
