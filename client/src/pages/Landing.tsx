import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Brain, Clock, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            YouTube Feed Summarizer
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            구독한 YouTube 채널의 영상을 AI로 요약하여 빠르게 미리보기하고, 
            시청할 영상을 효율적으로 선택하세요.
          </p>
          <Button 
            size="lg" 
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg"
            onClick={() => window.location.href = "/api/login"}
          >
            Google로 시작하기
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Brain className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <CardTitle>AI 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Gemini Flash를 활용하여 영상의 핵심 내용을 자동으로 요약합니다.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <CardTitle>시간 절약</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                영상을 보기 전에 요약을 통해 시청할 가치가 있는지 미리 판단하세요.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <CardTitle>채널 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                관심 있는 YouTube 채널을 추가하고 새로운 영상을 자동으로 수집합니다.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">주요 기능</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">채널 구독</h3>
              <p className="text-sm text-gray-600">
                YouTube 채널 ID로 간편하게 채널을 추가하고 관리하세요.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">자동 수집</h3>
              <p className="text-sm text-gray-600">
                RSS 피드를 통해 새로운 영상을 1시간마다 자동으로 수집합니다.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">스마트 필터</h3>
              <p className="text-sm text-gray-600">
                1분 이상의 영상만 수집하여 품질 높은 콘텐츠를 제공합니다.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">업보트 시스템</h3>
              <p className="text-sm text-gray-600">
                좋은 영상에 업보트를 주어 커뮤니티와 함께 콘텐츠를 평가하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
