#!/bin/bash

echo "🔧 테스트용 PostgreSQL 설정 스크립트"
echo "=================================="

# Homebrew로 PostgreSQL 설치 확인
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL이 설치되어 있지 않습니다."
    echo "Homebrew로 설치하려면 다음 명령을 실행하세요:"
    echo "brew install postgresql@15"
    echo "brew services start postgresql@15"
    exit 1
fi

# PostgreSQL 실행 확인
if ! pg_isready &> /dev/null; then
    echo "PostgreSQL이 실행되고 있지 않습니다."
    echo "다음 명령으로 시작하세요:"
    echo "brew services start postgresql@15"
    exit 1
fi

echo "✅ PostgreSQL이 실행 중입니다."

# 테스트 데이터베이스 생성
echo "📦 테스트 데이터베이스 생성 중..."
createdb exhell_test 2>/dev/null || echo "데이터베이스가 이미 존재합니다."

# 연결 테스트
echo "🔗 데이터베이스 연결 테스트..."
psql -d exhell_test -c "SELECT 1;" &> /dev/null

if [ $? -eq 0 ]; then
    echo "✅ 데이터베이스 연결 성공!"
    echo ""
    echo "다음 명령으로 서버를 실행하세요:"
    echo "npm run dev:test"
else
    echo "❌ 데이터베이스 연결 실패"
    echo "DATABASE_URL을 확인하세요:"
    echo "postgresql://[사용자명]:[비밀번호]@localhost:5432/exhell_test"
fi