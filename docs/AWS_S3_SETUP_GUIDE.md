# AWS S3 설정 가이드

## 1. AWS S3 버킷 생성

### 1.1 AWS Console 접속
1. AWS 콘솔 (https://console.aws.amazon.com) 접속
2. S3 서비스 선택

### 1.2 버킷 생성
1. "버킷 만들기" 클릭
2. 버킷 이름: `excelapp-files-prod` (또는 원하는 이름)
3. 리전: `ap-northeast-2` (아시아 태평양 - 서울)
4. 퍼블릭 액세스 차단: 모든 퍼블릭 액세스 차단 설정 유지
5. 버킷 버전 관리: 활성화 (파일 버전 관리용)

## 2. IAM 사용자 생성

### 2.1 IAM 정책 생성
1. IAM 서비스 → 정책 → 정책 생성
2. JSON 탭에서 다음 정책 입력:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::excelapp-files-prod",
        "arn:aws:s3:::excelapp-files-prod/*"
      ]
    }
  ]
}
```

3. 정책 이름: `ExcelAppS3Policy`

### 2.2 IAM 사용자 생성
1. IAM 서비스 → 사용자 → 사용자 생성
2. 사용자 이름: `excelapp-s3-user`
3. 액세스 키 - 프로그래밍 방식 액세스 선택
4. 권한 설정: 기존 정책 직접 연결 → `ExcelAppS3Policy` 선택
5. 액세스 키 ID와 비밀 액세스 키 저장 (한 번만 표시됨)

## 3. S3 CORS 설정

### 3.1 CORS 구성
1. S3 버킷 → 권한 → CORS(Cross-Origin Resource Sharing)
2. 다음 CORS 구성 입력:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    "AllowedOrigins": [
      "https://your-app-domain.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

## 4. 라이프사이클 정책 설정

### 4.1 수명 주기 규칙 생성
1. S3 버킷 → 관리 → 수명 주기 규칙 → 수명 주기 규칙 생성
2. 규칙 이름: `ExcelAppLifecycle`
3. 규칙 범위: 버킷의 모든 객체에 적용

### 4.2 전환 규칙 설정
- **Standard → Standard-IA**: 30일 후
- **Standard-IA → Glacier**: 90일 후
- **Glacier → Deep Archive**: 180일 후 (선택사항)

### 4.3 만료 규칙 설정
- **현재 버전 만료**: 365일 후 (1년)
- **미완료 멀티파트 업로드 삭제**: 7일 후

## 5. 예상 비용 계산

### 5.1 스토리지 비용 (ap-northeast-2 기준)
- **S3 Standard**: $0.023/GB/월
- **S3 Standard-IA**: $0.0125/GB/월
- **S3 Glacier**: $0.0045/GB/월

### 5.2 요청 비용
- **PUT 요청**: $0.0047/1,000개
- **GET 요청**: $0.0004/1,000개

### 5.3 월 5GB 사용량 기준 예상 비용
```
저장 비용: 5GB × $0.023 = $0.115
PUT 요청: 1,000회 × $0.0047 = $4.7
GET 요청: 2,000회 × $0.0004 = $0.8
총 월 비용: 약 $5.6 (₩7,500)
```

## 6. 보안 권장사항

### 6.1 액세스 로그 활성화
1. S3 버킷 → 속성 → 서버 액세스 로깅
2. 로그 저장용 별도 버킷 생성 권장

### 6.2 암호화 활성화
1. S3 버킷 → 속성 → 기본 암호화
2. Amazon S3 관리 키(SSE-S3) 선택

### 6.3 버전 관리 활성화
1. S3 버킷 → 속성 → 버전 관리
2. 버전 관리 활성화 (실수로 파일 삭제 방지)

## 7. 모니터링 설정

### 7.1 CloudWatch 메트릭 활성화
1. S3 버킷 → 메트릭 → 요청 메트릭
2. 필터 이름: `EntireBucket`
3. 모든 객체에 적용

### 7.2 비용 알림 설정
1. CloudWatch → 청구 → 결제 알림 생성
2. 임계값: $10 (원하는 금액)
3. SNS 주제를 통해 이메일 알림

## 8. 문제 해결

### 8.1 일반적인 오류
- **403 Forbidden**: IAM 권한 확인
- **CORS 오류**: CORS 구성 확인
- **업로드 실패**: 버킷 정책 및 네트워크 확인

### 8.2 성능 최적화
- **Transfer Acceleration**: 전 세계 업로드 속도 향상
- **멀티파트 업로드**: 100MB 이상 파일에 권장
- **CloudFront**: 다운로드 속도 향상

## 9. 다음 단계
1. render.com 환경변수 설정
2. 애플리케이션 코드 테스트
3. 모니터링 및 비용 최적화