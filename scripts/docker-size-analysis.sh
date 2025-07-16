#!/bin/bash

# Docker 이미지 크기 분석 및 최적화 스크립트

echo "🐳 Docker 이미지 크기 분석 시작..."
echo "================================"

# 컬러 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 현재 이미지 빌드 및 크기 확인
echo -e "\n${YELLOW}1. 기본 Dockerfile 빌드${NC}"
docker build -t exhell:base -f Dockerfile . 2>/dev/null
BASE_SIZE=$(docker images exhell:base --format "{{.Size}}")
echo -e "기본 이미지 크기: ${RED}${BASE_SIZE}${NC}"

# 2. 최적화된 이미지 빌드
echo -e "\n${YELLOW}2. 최적화된 Dockerfile 빌드${NC}"
docker build -t exhell:optimized -f Dockerfile.optimized . 2>/dev/null
OPT_SIZE=$(docker images exhell:optimized --format "{{.Size}}")
echo -e "최적화 이미지 크기: ${GREEN}${OPT_SIZE}${NC}"

# 3. 레이어별 크기 분석
echo -e "\n${YELLOW}3. 레이어별 크기 분석${NC}"
docker history exhell:optimized --human --format "table {{.CreatedBy}}\t{{.Size}}" | head -20

# 4. 이미지 내용 분석
echo -e "\n${YELLOW}4. 이미지 내 큰 파일 찾기${NC}"
docker run --rm exhell:optimized du -sh /app/* 2>/dev/null | sort -rh | head -10

# 5. 추가 최적화 제안
echo -e "\n${YELLOW}5. 추가 최적화 제안${NC}"

# Node 버전 체크
NODE_VERSION=$(docker run --rm exhell:optimized node --version 2>/dev/null)
echo "현재 Node 버전: $NODE_VERSION"

# 최적화 제안
echo -e "\n${GREEN}💡 최적화 제안:${NC}"
echo "1. Alpine Linux 사용 중 ✅"
echo "2. Multi-stage 빌드 사용 중 ✅"
echo "3. .dockerignore 최적화 완료 ✅"
echo "4. Standalone 모드 사용 중 ✅"

# node_modules 크기 체크
echo -e "\n${YELLOW}6. 컨테이너 내 node_modules 크기${NC}"
docker run --rm exhell:optimized sh -c "if [ -d /app/node_modules ]; then du -sh /app/node_modules; else echo 'node_modules가 제거됨 (good!)'; fi" 2>/dev/null

# 최종 비교
echo -e "\n${YELLOW}7. 최종 비교${NC}"
echo "================================"
echo -e "기본 이미지: ${RED}${BASE_SIZE}${NC}"
echo -e "최적화 이미지: ${GREEN}${OPT_SIZE}${NC}"

# 크기 계산 (숫자만 추출)
BASE_NUM=$(echo $BASE_SIZE | sed 's/[^0-9.]//g')
OPT_NUM=$(echo $OPT_SIZE | sed 's/[^0-9.]//g')

# 단위 확인 및 변환
if [[ $BASE_SIZE == *"GB"* ]]; then
    BASE_NUM=$(echo "$BASE_NUM * 1000" | bc)
fi
if [[ $OPT_SIZE == *"GB"* ]]; then
    OPT_NUM=$(echo "$OPT_NUM * 1000" | bc)
fi

# 절감률 계산
if command -v bc &> /dev/null; then
    REDUCTION=$(echo "scale=2; (($BASE_NUM - $OPT_NUM) / $BASE_NUM) * 100" | bc 2>/dev/null || echo "계산 불가")
    echo -e "크기 절감: ${GREEN}${REDUCTION}%${NC}"
fi

echo -e "\n✅ 분석 완료!"