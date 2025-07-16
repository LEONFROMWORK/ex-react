#!/bin/bash

# Excel App 테스트 실행 스크립트

echo "🚀 Excel App 테스트 환경을 시작합니다..."

# 1. npm install (socket.io 설치 포함)
echo "📦 패키지 설치 중..."
npm install

# 2. start-services.js 실행
echo "🔧 서비스 시작 중..."
node start-services.js