# CSS 설정 정리 가이드

## 1. 불필요한 파일 삭제
```bash
rm -f postcss.config.mjs postcss.config.cjs
rm -f tailwind.config.ts
rm -f src/app/global.css src/app/globals.css
```

## 2. 캐시 삭제
```bash
rm -rf .next
```

## 3. 서버 재시작
```bash
npm run dev
```

## 현재 구조:
- CSS 파일: `src/styles/globals.css`
- PostCSS 설정: `postcss.config.js`
- Tailwind 설정: `tailwind.config.js`

이제 CSS 파일이 src/styles 폴더에 있어서 app 디렉토리의 특수 처리를 피할 수 있습니다.