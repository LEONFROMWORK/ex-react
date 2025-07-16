#!/bin/bash

# Excel App 개발 환경 시작 스크립트

echo "🚀 Excel App 개발 환경을 시작합니다..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Redis 확인 및 시작
echo -e "\n${YELLOW}1. Redis 서버 확인...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis가 이미 실행 중입니다${NC}"
    else
        echo "Redis 시작 중..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start redis
        else
            sudo systemctl start redis
        fi
        sleep 2
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis가 시작되었습니다${NC}"
        else
            echo -e "${RED}✗ Redis 시작 실패${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Redis가 설치되지 않았습니다${NC}"
    echo "설치: brew install redis (Mac) 또는 sudo apt-get install redis-server (Linux)"
fi

# 2. PostgreSQL 확인
echo -e "\n${YELLOW}2. PostgreSQL 확인...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL이 설치되어 있습니다${NC}"
else
    echo -e "${RED}✗ PostgreSQL이 설치되지 않았습니다${NC}"
    echo "설치: brew install postgresql (Mac) 또는 sudo apt-get install postgresql (Linux)"
fi

# 3. Python & oletools 확인
echo -e "\n${YELLOW}3. Python 환경 확인...${NC}"
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ Python3가 설치되어 있습니다${NC}"
    
    # oletools 확인
    if python3 -c "import oletools" 2>/dev/null; then
        echo -e "${GREEN}✓ oletools가 설치되어 있습니다${NC}"
    else
        echo -e "${YELLOW}! oletools가 설치되지 않았습니다. 설치 중...${NC}"
        pip3 install oletools
    fi
else
    echo -e "${RED}✗ Python3가 설치되지 않았습니다${NC}"
fi

# 4. Node.js 패키지 확인
echo -e "\n${YELLOW}4. Node.js 패키지 확인...${NC}"
if [ ! -d "node_modules" ]; then
    echo "패키지 설치가 필요합니다. npm install 실행 중..."
    npm install
else
    echo -e "${GREEN}✓ Node.js 패키지가 설치되어 있습니다${NC}"
fi

# 5. 환경 변수 확인
echo -e "\n${YELLOW}5. 환경 변수 확인...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local 파일이 있습니다${NC}"
else
    echo -e "${YELLOW}! .env.local 파일이 없습니다. 생성 중...${NC}"
    cp .env.example .env.local 2>/dev/null || echo "DATABASE_URL=postgresql://user:password@localhost:5432/excelapp" > .env.local
    echo "⚠️  .env.local 파일을 확인하고 필요한 값을 설정하세요"
fi

# 6. 데이터베이스 마이그레이션
echo -e "\n${YELLOW}6. 데이터베이스 설정...${NC}"
echo "Prisma 마이그레이션 실행 중..."
npx prisma generate
npx prisma migrate dev --skip-seed

# 7. 서버 시작
echo -e "\n${YELLOW}7. 서버 시작...${NC}"
echo -e "${GREEN}모든 준비가 완료되었습니다!${NC}"
echo ""
echo "다음 명령어로 서버를 시작하세요:"
echo ""
echo "  1) Next.js 개발 서버: ${GREEN}npm run dev${NC}"
echo "  2) WebSocket 서버: ${GREEN}node socket-server.js${NC} (별도 터미널)"
echo ""
echo "테스트 실행:"
echo "  ${GREEN}node tests/quick-test.js${NC}"
echo ""
echo "접속 주소:"
echo "  - 메인: http://localhost:3000"
echo "  - Excel 대시보드: http://localhost:3000/excel/dashboard"
echo "  - VBA 추출: http://localhost:3000/vba/extract"
echo "  - 캐시 관리: http://localhost:3000/admin/cache"

# 선택적: 자동으로 서버 시작
read -p "지금 개발 서버를 시작하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 새 터미널에서 WebSocket 서버 시작 (Mac)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && node socket-server.js"'
    fi
    
    # Next.js 개발 서버 시작
    npm run dev
fi