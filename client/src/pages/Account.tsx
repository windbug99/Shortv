import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Account() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "인증 필요",
        description: "계정 페이지를 보려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleDeleteAccount = () => {
    if (confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      toast({
        title: "계정 삭제",
        description: "계정 삭제 기능은 아직 구현되지 않았습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">계정</h1>
        
        {/* Profile Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="flex items-center space-x-3 mt-2">
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="flex-1 bg-gray-50"
                />
                <Button 
                  onClick={handleLogout}
                  className="bg-gray-900 text-white hover:bg-gray-800"
                >
                  로그아웃
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">위험 구역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">계정 삭제</h3>
                <p className="text-sm text-gray-500">
                  계정과 모든 데이터를 영구적으로 삭제합니다
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                계정 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
