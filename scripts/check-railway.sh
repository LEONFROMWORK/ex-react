#!/bin/bash

# Railway API를 사용하여 프로젝트 상태 확인
# 사용법: RAILWAY_TOKEN=your-token ./scripts/check-railway.sh

if [ -z "$RAILWAY_TOKEN" ]; then
    echo "Error: RAILWAY_TOKEN 환경 변수가 설정되지 않았습니다."
    echo "사용법: RAILWAY_TOKEN=your-token ./scripts/check-railway.sh"
    exit 1
fi

echo "Railway 프로젝트 정보 확인 중..."

# GraphQL 쿼리로 프로젝트 정보 가져오기
curl -s -X POST https://backboard.railway.app/graphql \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { me { projects { edges { node { id name environments { edges { node { id name deployments(first: 1) { edges { node { id status createdAt } } } } } } } } } }"
  }' | jq '.'

echo -e "\n최근 배포 로그 확인:"
# 배포 로그는 Railway CLI를 통해 확인
railway logs --tail 50