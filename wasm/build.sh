#!/bin/bash

# WASM 모듈 빌드 스크립트
echo "🚀 Building Excel WASM module..."

# wasm-pack 설치 확인
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack이 설치되지 않았습니다."
    echo "설치 명령: cargo install wasm-pack"
    exit 1
fi

# Rust 프로젝트 빌드
echo "📦 Compiling Rust to WebAssembly..."
wasm-pack build --target web --out-dir pkg --release

if [ $? -eq 0 ]; then
    echo "✅ WASM 모듈 빌드 완료!"
    echo "📂 출력 경로: ./pkg/"
    
    # 파일 크기 확인
    echo "📊 생성된 파일들:"
    ls -lh pkg/
    
    # TypeScript 타입 확인
    if [ -f "pkg/excel_wasm.d.ts" ]; then
        echo "✅ TypeScript 타입 정의 생성됨"
    fi
    
    # WASM 파일 크기 최적화 확인
    WASM_SIZE=$(stat -f%z pkg/excel_wasm_bg.wasm 2>/dev/null || stat -c%s pkg/excel_wasm_bg.wasm)
    echo "📏 WASM 파일 크기: $(($WASM_SIZE / 1024))KB"
    
    if [ $WASM_SIZE -lt 500000 ]; then  # 500KB 미만
        echo "✅ 최적화된 크기입니다"
    else
        echo "⚠️ 파일 크기가 큽니다. 추가 최적화를 고려하세요"
    fi
    
else
    echo "❌ WASM 모듈 빌드 실패"
    exit 1
fi