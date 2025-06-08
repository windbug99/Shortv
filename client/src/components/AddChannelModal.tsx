import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AddChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddChannelModal({ open, onOpenChange }: AddChannelModalProps) {
  const [channelId, setChannelId] = useState("");
  const { toast } = useToast();

  const addChannelMutation = useMutation({
    mutationFn: async (channelData: { channelId: string; name: string }) => {
      const response = await apiRequest("POST", "/api/channels", channelData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
      setChannelId("");
      onOpenChange(false);
      toast({
        title: "성공",
        description: "채널이 성공적으로 추가되었습니다.",
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
        description: "채널 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelId.trim()) {
      toast({
        title: "입력 오류",
        description: "채널 ID를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Validate YouTube Channel ID format
    if (!channelId.startsWith("UC") || channelId.length !== 24) {
      toast({
        title: "형식 오류",
        description: "올바른 YouTube 채널 ID를 입력해주세요. (UC로 시작하는 24자리)",
        variant: "destructive",
      });
      return;
    }

    addChannelMutation.mutate({
      channelId: channelId.trim(),
      name: `Channel_${channelId.slice(2, 8)}`, // Temporary name, will be updated by RSS
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>채널 추가</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="channelId">Channel ID</Label>
            <Input
              id="channelId"
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              YouTube 채널의 Channel ID를 입력하세요 (UC로 시작하는 24자리)
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addChannelMutation.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={addChannelMutation.isPending}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {addChannelMutation.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
