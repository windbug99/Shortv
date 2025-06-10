#!/usr/bin/env python3
import sys
import os
from pytube import YouTube
import subprocess

def extract_audio_with_pytube(video_id, output_path, duration_seconds=180):
    """
    PyTube를 사용해 YouTube 영상에서 오디오를 추출합니다.
    
    Args:
        video_id (str): YouTube 영상 ID
        output_path (str): 출력 파일 경로
        duration_seconds (int): 추출할 오디오 길이 (초)
    
    Returns:
        bool: 성공 여부
    """
    try:
        # YouTube URL 생성
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # YouTube 객체 생성
        yt = YouTube(url)
        
        # 오디오 스트림 선택 (가장 높은 품질)
        audio_stream = yt.streams.filter(only_audio=True).first()
        
        if not audio_stream:
            print("No audio stream available", file=sys.stderr)
            return False
        
        # 임시 파일로 다운로드
        temp_path = output_path.replace('.wav', '_temp.mp4')
        audio_stream.download(filename=temp_path)
        
        # FFmpeg를 사용해 WAV로 변환하고 길이 제한
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', temp_path,
            '-t', str(duration_seconds),
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            output_path
        ]
        
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
        # 임시 파일 삭제
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if result.returncode == 0 and os.path.exists(output_path):
            print(f"Successfully extracted audio using PyTube: {output_path}")
            return True
        else:
            print(f"FFmpeg conversion failed: {result.stderr}", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"PyTube extraction failed: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python pytubeExtractor.py <video_id> <output_path> <duration_seconds>")
        sys.exit(1)
    
    video_id = sys.argv[1]
    output_path = sys.argv[2]
    duration_seconds = int(sys.argv[3])
    
    success = extract_audio_with_pytube(video_id, output_path, duration_seconds)
    sys.exit(0 if success else 1)