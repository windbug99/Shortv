#!/bin/bash

echo "Preparing project for deployment..."

# Clean up temporary files
echo "Cleaning temporary files..."
rm -rf temp/*.mp4 temp/*.webm temp/*.avi temp/*.mov temp/*.mkv temp/*.wmv temp/*.mp3 temp/*.wav temp/*.flac 2>/dev/null || true
rm -rf temp/*.part temp/*.ytdl 2>/dev/null || true

# Clean up cache directories
echo "Cleaning cache directories..."
rm -rf .cache/uv/archive-v0/ 2>/dev/null || true
rm -rf node_modules/.cache/ 2>/dev/null || true

# Clean up Python cache
echo "Cleaning Python cache..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

# Clean up logs
echo "Cleaning log files..."
rm -rf logs/ *.log 2>/dev/null || true

# Clean up development files
echo "Cleaning development files..."
rm -rf .vscode/ .idea/ 2>/dev/null || true

# Show final size
echo "Project size after cleanup:"
du -sh . --exclude=.git --exclude=node_modules 2>/dev/null || du -sh .

echo "Deployment preparation complete!"