# 🔄 서버 재시작 가이드

## 문제 해결 완료
- ✅ NODE_ENV 설정 제거
- ✅ PostCSS 설정 수정
- ✅ Tailwind 중복 키 제거

## 서버 재시작 방법

1. **현재 서버 중지** (Ctrl + C)

2. **캐시 정리**
```bash
rm -rf .next
```

3. **서버 재시작**
```bash
npm run dev
```

## 만약 여전히 오류가 발생한다면:

```bash
# 완전 재설치
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

서버는 http://localhost:3000 에서 실행됩니다.