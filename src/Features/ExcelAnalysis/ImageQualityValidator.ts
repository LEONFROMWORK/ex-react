import { Result } from '@/src/Common/Result';
import { DomainError, ExcelError } from '@/src/Common/Errors';

export interface ImageQualityMetrics {
  width: number;
  height: number;
  fileSize: number;
  estimatedDPI: number;
  isBlurry: boolean;
  hasText: boolean;
  contrastRatio: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  quality: 'high' | 'medium' | 'low';
  issues: string[];
  suggestions: string[];
  metrics: ImageQualityMetrics;
}

export class ImageQualityValidator {
  private readonly MIN_WIDTH = 800;
  private readonly MIN_HEIGHT = 600;
  private readonly MIN_FILE_SIZE = 50 * 1024; // 50KB
  private readonly MIN_DPI = 72;
  private readonly MIN_CONTRAST_RATIO = 4.5;

  async validateImage(imageBuffer: Buffer, mimeType: string): Promise<Result<ImageValidationResult>> {
    try {
      const metrics = await this.analyzeImageMetrics(imageBuffer, mimeType);
      const validation = this.evaluateQuality(metrics);
      
      return Result.ok(validation);
    } catch (error) {
      return Result.fail(new ExcelError('IMAGE_VALIDATION_ERROR', '이미지 검증 중 오류가 발생했습니다.'));
    }
  }

  private async analyzeImageMetrics(imageBuffer: Buffer, mimeType: string): Promise<ImageQualityMetrics> {
    // 실제 구현에서는 sharp나 jimp 같은 이미지 처리 라이브러리 사용
    // 여기서는 간단한 메타데이터 분석만 수행
    
    const fileSize = imageBuffer.length;
    
    // 간단한 이미지 헤더 파싱 (PNG/JPEG)
    let width = 0;
    let height = 0;
    
    if (mimeType.includes('png')) {
      // PNG 헤더에서 크기 추출
      if (imageBuffer.length > 24) {
        width = imageBuffer.readUInt32BE(16);
        height = imageBuffer.readUInt32BE(20);
      }
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      // JPEG SOF0 마커에서 크기 추출 (간소화된 버전)
      for (let i = 0; i < imageBuffer.length - 9; i++) {
        if (imageBuffer[i] === 0xFF && imageBuffer[i + 1] === 0xC0) {
          height = imageBuffer.readUInt16BE(i + 5);
          width = imageBuffer.readUInt16BE(i + 7);
          break;
        }
      }
    }
    
    // DPI 추정 (파일 크기와 해상도 기반)
    const pixelCount = width * height;
    const bytesPerPixel = pixelCount > 0 ? fileSize / pixelCount : 0;
    const estimatedDPI = this.estimateDPI(width, height, fileSize);
    
    // 블러 감지 (간단한 휴리스틱)
    const isBlurry = bytesPerPixel < 0.5 || estimatedDPI < this.MIN_DPI;
    
    // 텍스트 존재 여부 (파일 크기 기반 추정)
    const hasText = fileSize > 100 * 1024 && bytesPerPixel > 0.3;
    
    // 대비율 (실제로는 이미지 분석 필요)
    const contrastRatio = isBlurry ? 2.0 : 5.0;
    
    return {
      width,
      height,
      fileSize,
      estimatedDPI,
      isBlurry,
      hasText,
      contrastRatio
    };
  }

  private estimateDPI(width: number, height: number, fileSize: number): number {
    if (width === 0 || height === 0) return 0;
    
    // 간단한 DPI 추정 공식
    const pixelCount = width * height;
    const compressionRatio = fileSize / (pixelCount * 3); // RGB 가정
    
    // 압축률 기반 품질 추정
    if (compressionRatio > 0.5) return 300; // 고품질
    if (compressionRatio > 0.2) return 150; // 중간 품질
    if (compressionRatio > 0.1) return 96;  // 웹 품질
    return 72; // 저품질
  }

  private evaluateQuality(metrics: ImageQualityMetrics): ImageValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let quality: 'high' | 'medium' | 'low' = 'high';
    
    // 해상도 검사
    if (metrics.width < this.MIN_WIDTH || metrics.height < this.MIN_HEIGHT) {
      issues.push(`해상도가 너무 낮습니다 (${metrics.width}x${metrics.height})`);
      suggestions.push(`최소 ${this.MIN_WIDTH}x${this.MIN_HEIGHT} 이상의 해상도로 캡처해주세요`);
      quality = 'low';
    }
    
    // 파일 크기 검사
    if (metrics.fileSize < this.MIN_FILE_SIZE) {
      issues.push('파일 크기가 너무 작습니다');
      suggestions.push('더 높은 품질로 저장하거나 압축을 줄여주세요');
      quality = quality === 'high' ? 'medium' : quality;
    }
    
    // DPI 검사
    if (metrics.estimatedDPI < this.MIN_DPI) {
      issues.push('이미지 품질이 낮을 수 있습니다');
      suggestions.push('화면 캡처 시 확대 비율을 100%로 설정해주세요');
      quality = 'low';
    }
    
    // 블러 검사
    if (metrics.isBlurry) {
      issues.push('이미지가 흐릿할 수 있습니다');
      suggestions.push('캡처 도구의 품질 설정을 확인해주세요');
      quality = 'low';
    }
    
    // 텍스트 가독성 검사
    if (!metrics.hasText && metrics.fileSize > 50 * 1024) {
      issues.push('텍스트를 식별하기 어려울 수 있습니다');
      suggestions.push('Excel 화면을 확대하여 텍스트가 선명하게 보이도록 캡처해주세요');
      quality = quality === 'high' ? 'medium' : quality;
    }
    
    // 대비율 검사
    if (metrics.contrastRatio < this.MIN_CONTRAST_RATIO) {
      issues.push('텍스트와 배경의 대비가 낮습니다');
      suggestions.push('화면 밝기를 조절하거나 Excel 테마를 변경해주세요');
      quality = quality === 'high' ? 'medium' : quality;
    }
    
    // 추가 제안사항
    if (quality === 'low') {
      suggestions.push('Windows: Win + Shift + S 또는 Snipping Tool 사용 권장');
      suggestions.push('Mac: Cmd + Shift + 4 또는 스크린샷 앱 사용 권장');
      suggestions.push('전체 화면이 아닌 필요한 부분만 캡처해주세요');
    }
    
    return {
      isValid: quality !== 'low' || issues.length === 0,
      quality,
      issues,
      suggestions,
      metrics
    };
  }

  generateUserMessage(validation: ImageValidationResult): string {
    if (validation.quality === 'high') {
      return '이미지 품질이 우수합니다. 분석을 진행합니다.';
    }
    
    let message = '';
    
    if (validation.quality === 'low') {
      message = '⚠️ 이미지 품질 개선이 필요합니다\n\n';
    } else {
      message = 'ℹ️ 더 나은 분석을 위한 제안사항\n\n';
    }
    
    if (validation.issues.length > 0) {
      message += '**발견된 문제:**\n';
      validation.issues.forEach(issue => {
        message += `• ${issue}\n`;
      });
      message += '\n';
    }
    
    if (validation.suggestions.length > 0) {
      message += '**개선 방법:**\n';
      validation.suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
    }
    
    if (validation.quality === 'low') {
      message += '\n\n더 정확한 분석을 위해 위 사항을 개선하여 다시 업로드해주시겠어요?';
    }
    
    return message;
  }

  // 스크린샷 촬영 가이드 생성
  generateCaptureGuide(): string {
    return `## 📸 최적의 스크린샷 촬영 가이드

### Windows 사용자
1. **Snipping Tool** (권장)
   - Win + Shift + S 단축키
   - 필요한 영역만 선택하여 캡처
   - 자동으로 클립보드에 복사

2. **전체 화면 캡처**
   - Print Screen 키
   - Alt + Print Screen (활성 창만)

### Mac 사용자
1. **부분 캡처** (권장)
   - Cmd + Shift + 4
   - 십자선으로 영역 선택

2. **전체 화면**
   - Cmd + Shift + 3

### 품질 향상 팁
✅ Excel 화면을 100% 배율로 설정
✅ 필요한 데이터가 모두 보이도록 조정
✅ 밝은 곳에서 화면 밝기 적절히 조절
✅ 셀 테두리가 선명하게 보이는지 확인
✅ PNG 형식으로 저장 (JPEG보다 텍스트 선명)

### 피해야 할 것들
❌ 휴대폰 카메라로 모니터 촬영
❌ 과도한 압축 또는 크기 축소
❌ 흐릿하거나 기울어진 이미지
❌ 반사광이나 그림자가 있는 사진`;
  }
}