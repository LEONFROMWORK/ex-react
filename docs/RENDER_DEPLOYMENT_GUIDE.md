# Render.com 배포 가이드

## 1. render.com 환경변수 설정

### 1.1 필수 환경변수

#### AWS S3 설정
```bash
# AWS 자격 증명
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-northeast-2

# S3 버킷 설정
AWS_S3_BUCKET=excelapp-files-prod
S3_BUCKET_NAME=excelapp-files-prod
```

#### 데이터베이스 설정
```bash
# PostgreSQL 데이터베이스
DATABASE_URL=postgresql://username:password@host:port/database
```

#### 인증 설정
```bash
# NextAuth.js 설정
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=your-random-secret-key
```

#### AI 서비스 설정
```bash
# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Anthropic API (선택사항)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

#### 기타 설정
```bash
# 환경
NODE_ENV=production

# Redis (선택사항 - 캐싱용)
REDIS_URL=redis://your-redis-host:6379

# 이메일 서비스 (선택사항)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
```

### 1.2 환경변수 설정 방법

1. **Render Dashboard 접속**
   - https://dashboard.render.com 로그인

2. **서비스 선택**
   - 배포할 웹 서비스 선택

3. **Environment 설정**
   - 왼쪽 메뉴에서 "Environment" 클릭
   - 각 환경변수 추가

4. **배포**
   - 환경변수 추가 후 자동 재배포 됨

## 2. 빌드 설정

### 2.1 Build Command
```bash
npm run build
```

### 2.2 Start Command
```bash
npm start
```

### 2.3 Node.js 버전
```bash
# package.json에 추가
"engines": {
  "node": ">=18.0.0"
}
```

## 3. 파일 저장소 전환

### 3.1 현재 설정 확인
현재 시스템은 다음 우선순위로 저장소를 선택:
1. AWS S3 (환경변수 `AWS_S3_BUCKET` 있을 때)
2. Azure Blob Storage (`AZURE_STORAGE_CONNECTION` 있을 때)
3. Local File Storage (기본값)

### 3.2 S3 활성화
환경변수 `AWS_S3_BUCKET` 설정하면 자동으로 S3 사용:
```typescript
// Container.ts:73-74
if (process.env.AWS_S3_BUCKET) {
  this.register("fileStorage", () => new S3FileStorage())
}
```

## 4. 데이터베이스 마이그레이션

### 4.1 PostgreSQL 데이터베이스 생성
1. Render Dashboard → "New" → "PostgreSQL"
2. 데이터베이스 이름: `excelapp-db`
3. 연결 정보 복사

### 4.2 Prisma 마이그레이션
```bash
# 로컬에서 마이그레이션 실행
npx prisma migrate deploy
```

### 4.3 초기 데이터 생성
```bash
# 시드 데이터 실행
npm run db:seed
```

## 5. 도메인 설정

### 5.1 커스텀 도메인 연결
1. Render Dashboard → 서비스 선택 → "Settings"
2. "Custom Domains" 섹션에서 도메인 추가
3. DNS 레코드 설정 (CNAME 또는 A 레코드)

### 5.2 SSL 인증서
- Render에서 자동으로 Let's Encrypt SSL 인증서 생성
- 커스텀 도메인 연결 시 자동 적용

## 6. 성능 최적화

### 6.1 리전 선택
- **Singapore**: 아시아 태평양 지역 최적화
- **Oregon**: 전 세계 접근성 균형

### 6.2 인스턴스 타입
- **Starter**: 무료 (512MB RAM, 0.1 CPU)
- **Standard**: $7/월 (512MB RAM, 0.5 CPU)
- **Pro**: $25/월 (1GB RAM, 1 CPU) - 권장

### 6.3 Auto-Deploy 설정
- GitHub 연결 시 자동 배포 활성화
- 프로덕션 브랜치: `main` 또는 `production`

## 7. 모니터링 및 로깅

### 7.1 로그 확인
```bash
# Render Dashboard에서 실시간 로그 확인
# 또는 CLI 사용:
render logs --service-id=your-service-id
```

### 7.2 헬스 체크
```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

### 7.3 메트릭 모니터링
- CPU 사용률
- 메모리 사용률
- 응답 시간
- 오류율

## 8. 보안 설정

### 8.1 환경변수 보안
- 모든 비밀 키는 환경변수로 관리
- 코드에 하드코딩 금지
- 정기적인 키 순환

### 8.2 CORS 설정
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://your-domain.com'
          }
        ]
      }
    ]
  }
}
```

## 9. 배포 체크리스트

### 9.1 배포 전 확인사항
- [ ] 모든 환경변수 설정 완료
- [ ] 데이터베이스 연결 테스트
- [ ] S3 버킷 및 권한 설정
- [ ] 로컬 테스트 완료
- [ ] 빌드 오류 없음

### 9.2 배포 후 확인사항
- [ ] 애플리케이션 정상 실행
- [ ] 파일 업로드/다운로드 테스트
- [ ] 데이터베이스 연결 확인
- [ ] AI 분석 기능 테스트
- [ ] 결제 시스템 테스트

## 10. 문제 해결

### 10.1 일반적인 오류
- **502 Bad Gateway**: 애플리케이션 시작 실패
- **503 Service Unavailable**: 배포 중 또는 재시작 중
- **Database Connection Error**: DATABASE_URL 확인

### 10.2 성능 문제
- 메모리 부족 시 인스턴스 업그레이드
- 응답 시간 증가 시 캐싱 추가
- 파일 업로드 실패 시 파일 크기 제한 확인

### 10.3 파일 저장소 문제
- S3 연결 오류 시 AWS 자격증명 확인
- 파일 업로드 실패 시 S3 권한 확인
- CORS 오류 시 S3 CORS 설정 확인

## 11. 비용 최적화

### 11.1 Render 요금제
- 개발/테스트: Starter (무료)
- 프로덕션: Standard ($7/월) 또는 Pro ($25/월)

### 11.2 자동 슬립 방지
```javascript
// 5분마다 자동 핑 (무료 플랜 슬립 방지)
setInterval(() => {
  fetch('/api/health')
}, 5 * 60 * 1000)
```

### 11.3 리소스 모니터링
- CPU/메모리 사용률 정기 확인
- 불필요한 백그라운드 작업 제거
- 효율적인 데이터베이스 쿼리 사용