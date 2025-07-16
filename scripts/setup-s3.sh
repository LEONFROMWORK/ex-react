#!/bin/bash

# AWS S3 설정 스크립트
# 사용법: ./setup-s3.sh your-bucket-name

BUCKET_NAME=${1:-excelapp-files-prod}
REGION=${2:-ap-northeast-2}

echo "🚀 AWS S3 버킷 설정 시작..."
echo "버킷 이름: $BUCKET_NAME"
echo "리전: $REGION"

# 1. S3 버킷 생성
echo "1. S3 버킷 생성 중..."
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

if [ $? -eq 0 ]; then
  echo "✅ S3 버킷 생성 완료"
else
  echo "❌ S3 버킷 생성 실패"
  exit 1
fi

# 2. 버킷 버전 관리 활성화
echo "2. 버킷 버전 관리 활성화 중..."
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

if [ $? -eq 0 ]; then
  echo "✅ 버킷 버전 관리 활성화 완료"
else
  echo "❌ 버킷 버전 관리 활성화 실패"
fi

# 3. 퍼블릭 액세스 차단
echo "3. 퍼블릭 액세스 차단 설정 중..."
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

if [ $? -eq 0 ]; then
  echo "✅ 퍼블릭 액세스 차단 설정 완료"
else
  echo "❌ 퍼블릭 액세스 차단 설정 실패"
fi

# 4. 서버 측 암호화 활성화
echo "4. 서버 측 암호화 활성화 중..."
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

if [ $? -eq 0 ]; then
  echo "✅ 서버 측 암호화 활성화 완료"
else
  echo "❌ 서버 측 암호화 활성화 실패"
fi

# 5. CORS 정책 설정
echo "5. CORS 정책 설정 중..."
aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration file://s3-cors-policy.json

if [ $? -eq 0 ]; then
  echo "✅ CORS 정책 설정 완료"
else
  echo "❌ CORS 정책 설정 실패"
fi

# 6. 라이프사이클 정책 설정
echo "6. 라이프사이클 정책 설정 중..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration file://s3-lifecycle-policy.json

if [ $? -eq 0 ]; then
  echo "✅ 라이프사이클 정책 설정 완료"
else
  echo "❌ 라이프사이클 정책 설정 실패"
fi

# 7. 버킷 정책 설정 (선택사항)
echo "7. 버킷 정책 설정 건너뛰기 (IAM 사용자 권한 사용)"

# 8. 로깅 설정 (선택사항)
echo "8. 액세스 로깅 설정 건너뛰기 (필요시 수동 설정)"

echo ""
echo "🎉 AWS S3 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. IAM 사용자 생성 및 권한 설정"
echo "2. 액세스 키 생성 및 환경변수 설정"
echo "3. 애플리케이션 테스트"
echo ""
echo "환경변수 설정 예시:"
echo "AWS_S3_BUCKET=$BUCKET_NAME"
echo "AWS_REGION=$REGION"
echo "AWS_ACCESS_KEY_ID=your_access_key"
echo "AWS_SECRET_ACCESS_KEY=your_secret_key"