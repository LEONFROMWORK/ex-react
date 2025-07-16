#!/usr/bin/env node

/**
 * 빠른 기능 테스트 스크립트
 * 사용법: node tests/quick-test.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// 테스트 헬퍼
const test = async (name, fn) => {
  try {
    console.log(`\n${colors.blue}[TEST]${colors.reset} ${name}`);
    await fn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.error(error.message);
  }
};

// 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 메인 테스트
async function runTests() {
  console.log(`${colors.yellow}=== Excel App 빠른 테스트 시작 ===${colors.reset}`);

  // 1. 서버 상태 확인
  await test('서버 연결 확인', async () => {
    const response = await axios.get(BASE_URL);
    if (response.status !== 200) {
      throw new Error('서버가 응답하지 않습니다');
    }
  });

  // 2. Excel 생성 테스트 (프롬프트)
  await test('Excel 생성 - AI 프롬프트', async () => {
    const response = await axios.post(`${API_BASE}/excel/generate-from-prompt`, {
      prompt: '간단한 매출 데이터 테이블을 만들어줘. 3개월치 데이터만 포함해줘.',
      options: {
        includeFormulas: true,
        includeFormatting: true,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        // 실제로는 인증 토큰 필요
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.data.success) {
      throw new Error('Excel 생성 실패');
    }
    
    console.log(`  생성된 파일: ${response.data.data.fileName}`);
    console.log(`  파일 크기: ${response.data.data.fileSize} bytes`);
  });

  // 3. 템플릿 목록 조회
  await test('템플릿 목록 조회', async () => {
    const response = await axios.get(`${API_BASE}/excel/templates`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.data.success) {
      throw new Error('템플릿 목록 조회 실패');
    }
    
    console.log(`  템플릿 개수: ${response.data.templates.length}`);
  });

  // 4. VBA 추출 테스트 (파일이 있는 경우)
  const vbaTestFile = path.join(__dirname, 'fixtures', 'sample-vba.xlsm');
  if (fs.existsSync(vbaTestFile)) {
    await test('VBA 코드 추출', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(vbaTestFile));
      formData.append('includeSecurityScan', 'true');

      const response = await axios.post(`${API_BASE}/vba/extract`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer test-token'
        }
      });

      if (!response.data.success) {
        throw new Error('VBA 추출 실패');
      }
      
      const { data } = response.data;
      console.log(`  VBA 모듈 수: ${data.vbaModules.length}`);
      console.log(`  보안 위협: ${data.securityScan?.summary.totalThreats || 0}`);
    });
  }

  // 5. 캐시 통계 확인 (관리자 권한 필요)
  await test('캐시 통계 조회', async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/cache/stats`, {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      if (response.data.success) {
        const { redis } = response.data.data;
        console.log(`  캐시 히트율: ${redis.hitRate}`);
        console.log(`  총 작업: ${redis.hits + redis.misses + redis.sets}`);
      }
    } catch (error) {
      console.log('  (관리자 권한 필요)');
    }
  });

  // 6. WebSocket 연결 테스트
  await test('WebSocket 연결', async () => {
    const io = require('socket.io-client');
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      timeout: 5000,
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('  WebSocket 연결 성공');
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (error) => {
        reject(new Error('WebSocket 연결 실패'));
      });

      setTimeout(() => {
        socket.disconnect();
        reject(new Error('WebSocket 연결 시간 초과'));
      }, 5000);
    });
  });

  // 7. 메모리 사용량 체크
  await test('메모리 사용량 확인', async () => {
    const used = process.memoryUsage();
    console.log(`  힙 사용: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
    console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
    
    if (used.heapUsed > 500 * 1024 * 1024) {
      console.log(`  ${colors.yellow}⚠ 메모리 사용량이 높습니다${colors.reset}`);
    }
  });

  console.log(`\n${colors.yellow}=== 테스트 완료 ===${colors.reset}`);
}

// 테스트 실행
runTests().catch(error => {
  console.error(`${colors.red}테스트 실행 중 오류:${colors.reset}`, error);
  process.exit(1);
});