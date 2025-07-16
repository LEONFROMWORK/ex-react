#!/bin/bash

echo "🚀 Node.js 18 자동 설치 스크립트"
echo "================================="

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# OS 확인
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ 이 스크립트는 macOS용입니다.${NC}"
    exit 1
fi

# Homebrew 확인
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}📦 Homebrew가 설치되어 있지 않습니다. 설치를 시작합니다...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# NVM 설치 확인
if ! command -v nvm &> /dev/null; then
    # .nvm 디렉토리 확인
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        echo -e "${YELLOW}📂 NVM이 설치되어 있지만 로드되지 않았습니다.${NC}"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        echo -e "${YELLOW}📦 NVM 설치 중...${NC}"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # NVM 환경 설정
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Shell 설정 파일에 추가
        if [ -f "$HOME/.zshrc" ]; then
            SHELL_CONFIG="$HOME/.zshrc"
        else
            SHELL_CONFIG="$HOME/.bash_profile"
        fi
        
        echo 'export NVM_DIR="$HOME/.nvm"' >> $SHELL_CONFIG
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> $SHELL_CONFIG
        echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> $SHELL_CONFIG
    fi
fi

# NVM 재확인
if ! command -v nvm &> /dev/null; then
    echo -e "${RED}❌ NVM 설치에 실패했습니다.${NC}"
    echo "다음 명령을 실행한 후 다시 시도하세요:"
    echo "source ~/.zshrc (또는 source ~/.bash_profile)"
    exit 1
fi

echo -e "${GREEN}✅ NVM이 준비되었습니다.${NC}"

# Node.js 18 설치
echo -e "${YELLOW}📦 Node.js 18 LTS 설치 중...${NC}"
nvm install 18
nvm use 18
nvm alias default 18

# 버전 확인
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js 설치 완료: $NODE_VERSION${NC}"

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/../.."

# 캐시 정리
echo -e "${YELLOW}🧹 캐시 정리 중...${NC}"
rm -rf node_modules package-lock.json .next

# Next.js 14.1.4 복원
echo -e "${YELLOW}📦 Next.js 14.1.4 설치 중...${NC}"
npm install next@14.1.4

# 의존성 재설치
echo -e "${YELLOW}📦 모든 의존성 재설치 중...${NC}"
npm install

echo -e "${GREEN}✨ 설치 완료!${NC}"
echo ""
echo "다음 명령으로 서버를 실행하세요:"
echo -e "${GREEN}npm run dev${NC}"
echo ""
echo "만약 'nvm' 명령을 찾을 수 없다면:"
echo "1. 새 터미널을 열거나"
echo "2. source ~/.zshrc (또는 source ~/.bash_profile) 실행"