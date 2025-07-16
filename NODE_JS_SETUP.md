# Node.js 18 설치 가이드

## 🚀 빠른 설치 (macOS)

### 1. NVM (Node Version Manager) 설치

```bash
# Homebrew가 없다면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 또는 Homebrew로 설치
brew install nvm
```

### 2. NVM 설정 추가

```bash
# ~/.zshrc 또는 ~/.bash_profile에 추가
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc

# 설정 다시 로드
source ~/.zshrc
```

### 3. Node.js 18 설치 및 사용

```bash
# Node.js 18 LTS 설치
nvm install 18

# Node.js 18 사용
nvm use 18

# 기본 버전으로 설정
nvm alias default 18

# 버전 확인
node --version  # v18.x.x가 표시되어야 함
```

### 4. 프로젝트에서 Next.js 14.1.4 복원

```bash
# 프로젝트 디렉토리에서
cd /Users/kevin/excelapp

# 캐시 정리
rm -rf node_modules package-lock.json .next

# Next.js 14.1.4 설치
npm install next@14.1.4

# 모든 의존성 재설치
npm install

# 서버 실행
npm run dev
```

## 🔧 대안: Homebrew로 직접 설치

NVM 없이 바로 설치하려면:

```bash
# Node.js 18 설치
brew install node@18

# 링크 설정
brew link --overwrite node@18

# 버전 확인
node --version
```

## ⚡ 빠른 실행 스크립트

다음 스크립트를 실행하면 자동으로 처리됩니다:

```bash
chmod +x scripts/setup/install-node18.sh
./scripts/setup/install-node18.sh
```

## 🎯 설치 후 확인사항

1. Node.js 버전: `node --version` → v18.x.x
2. npm 버전: `npm --version` → 9.x.x 이상
3. Next.js 버전: `npx next --version` → 14.1.4

## ❓ 문제 해결

### NVM 명령을 찾을 수 없는 경우
```bash
# 새 터미널 창을 열거나
source ~/.zshrc
```

### 권한 오류가 발생하는 경우
```bash
# npm 전역 디렉토리 권한 수정
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Node.js 버전이 변경되지 않는 경우
```bash
# 현재 사용 중인 Node 버전 확인
which node

# NVM으로 관리되는 버전 목록
nvm list

# 강제로 18 버전 사용
nvm use 18 --delete-prefix
```