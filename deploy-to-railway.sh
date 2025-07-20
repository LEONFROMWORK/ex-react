#!/bin/bash

echo "Railway 배포 스크립트"
echo "====================="

# 환경 변수 설정
export RAILWAY_TOKEN="${RAILWAY_TOKEN}"

# Railway CLI 사용하여 배포
echo "1. Railway 프로젝트 정보 확인..."
railway status

echo -e "\n2. 환경 변수 설정 중..."
# 필수 환경 변수 설정
railway variables set NIXPACKS_NODE_VERSION=18
railway variables set NIXPACKS_PYTHON_VERSION=3.10
railway variables set NODE_ENV=production
railway variables set ENABLE_PAYMENT_FEATURES=false
railway variables set SKIP_EMAIL_VERIFICATION=true
railway variables set NEXT_PUBLIC_DEMO_MODE=true

echo -e "\n3. 배포 시작..."
railway up --detach

echo -e "\n배포가 시작되었습니다. Railway 대시보드에서 진행 상황을 확인하세요."
echo "https://railway.app/project/a35b2fd3-c70b-487d-b8e2-fe38a966f0d1"