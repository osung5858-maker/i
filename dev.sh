#!/bin/bash
# dev.sh — 기존 프로세스 종료 후 dev 서버 실행

PORT=${1:-3000}

# 해당 포트 프로세스 종료
lsof -ti:$PORT | xargs kill -9 2>/dev/null

echo "🚀 Starting dev server on port $PORT..."
npx next dev --turbopack -p $PORT
