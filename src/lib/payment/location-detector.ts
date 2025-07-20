import { UserLocation } from './types';

// IP Geolocation 서비스 인터페이스
interface IPGeolocationResponse {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
  currency?: string;
}

export class LocationDetector {
  private static instance: LocationDetector;
  private cache: Map<string, UserLocation> = new Map();
  private readonly cacheExpiry = 1000 * 60 * 60; // 1시간

  private constructor() {}

  static getInstance(): LocationDetector {
    if (!LocationDetector.instance) {
      LocationDetector.instance = new LocationDetector();
    }
    return LocationDetector.instance;
  }

  /**
   * 사용자 위치 감지
   * 우선순위: 1. 사용자 선택 2. IP 기반 3. 브라우저 언어
   */
  async detectUserLocation(
    userPreference?: string,
    ipAddress?: string
  ): Promise<UserLocation> {
    // 1. 사용자가 직접 선택한 경우
    if (userPreference) {
      return this.getLocationFromPreference(userPreference);
    }

    // 2. 캐시 확인
    const cacheKey = ipAddress || 'default';
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    // 3. IP 기반 감지 시도
    if (ipAddress) {
      try {
        const ipLocation = await this.detectByIP(ipAddress);
        if (ipLocation) {
          this.cache.set(cacheKey, ipLocation);
          return ipLocation;
        }
      } catch (error) {
        console.error('IP geolocation failed:', error);
      }
    }

    // 4. 브라우저 언어 기반 감지
    const browserLocation = this.detectByBrowserLanguage();
    this.cache.set(cacheKey, browserLocation);
    return browserLocation;
  }

  /**
   * IP 주소로 위치 감지
   */
  private async detectByIP(ipAddress: string): Promise<UserLocation | null> {
    try {
      // 실제 구현에서는 IP Geolocation API 사용
      // 예: ipapi.co, ipgeolocation.io, ip-api.com 등
      const response = await fetch(
        `https://ipapi.co/${ipAddress}/json/`,
        {
          headers: {
            'User-Agent': 'ExcelApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('IP geolocation request failed');
      }

      const data: IPGeolocationResponse = await response.json();

      if (!data.countryCode) {
        return null;
      }

      return this.mapCountryToLocation(data.countryCode, data);
    } catch (error) {
      console.error('IP geolocation error:', error);
      return null;
    }
  }

  /**
   * 브라우저 언어 설정으로 위치 감지
   */
  private detectByBrowserLanguage(): UserLocation {
    if (typeof window === 'undefined') {
      // 서버사이드에서는 기본값 반환
      return this.getDefaultLocation();
    }

    const language = navigator.language || navigator.languages?.[0] || 'en-US';
    const [lang, region] = language.split('-');

    // 한국어 설정인 경우
    if (lang === 'ko' || region === 'KR') {
      return {
        country: 'KR',
        region: 'KR',
        currency: 'KRW',
        paymentGateway: 'TOSS',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul'
      };
    }

    // 일본어 설정인 경우
    if (lang === 'ja' || region === 'JP') {
      return {
        country: 'JP',
        region: 'GLOBAL',
        currency: 'JPY',
        paymentGateway: 'STRIPE',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo'
      };
    }

    // 중국어 설정인 경우
    if (lang === 'zh' || region === 'CN') {
      return {
        country: 'CN',
        region: 'GLOBAL',
        currency: 'CNY',
        paymentGateway: 'STRIPE',
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai'
      };
    }

    // 기타 모든 경우는 글로벌(미국 기본)
    return this.getDefaultLocation();
  }

  /**
   * 사용자 선택 기반 위치 정보
   */
  private getLocationFromPreference(preference: string): UserLocation {
    const locationMap: Record<string, UserLocation> = {
      'KR': {
        country: 'KR',
        region: 'KR',
        currency: 'KRW',
        paymentGateway: 'TOSS',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul'
      },
      'US': {
        country: 'US',
        region: 'GLOBAL',
        currency: 'USD',
        paymentGateway: 'STRIPE',
        locale: 'en-US',
        timezone: 'America/New_York'
      },
      'JP': {
        country: 'JP',
        region: 'GLOBAL',
        currency: 'JPY',
        paymentGateway: 'STRIPE',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo'
      },
      'CN': {
        country: 'CN',
        region: 'GLOBAL',
        currency: 'CNY',
        paymentGateway: 'STRIPE',
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai'
      },
      'EU': {
        country: 'EU',
        region: 'GLOBAL',
        currency: 'EUR',
        paymentGateway: 'STRIPE',
        locale: 'en-GB',
        timezone: 'Europe/London'
      }
    };

    return locationMap[preference] || this.getDefaultLocation();
  }

  /**
   * 국가 코드를 위치 정보로 매핑
   */
  private mapCountryToLocation(
    countryCode: string,
    geoData?: IPGeolocationResponse
  ): UserLocation {
    // 한국인 경우
    if (countryCode === 'KR') {
      return {
        country: 'KR',
        region: 'KR',
        currency: 'KRW',
        paymentGateway: 'TOSS',
        locale: 'ko-KR',
        timezone: geoData?.timezone || 'Asia/Seoul'
      };
    }

    // 국가별 통화 매핑
    const currencyMap: Record<string, string> = {
      'US': 'USD',
      'JP': 'JPY',
      'CN': 'CNY',
      'GB': 'GBP',
      'EU': 'EUR',
      'CA': 'CAD',
      'AU': 'AUD'
    };

    const currency = currencyMap[countryCode] || 'USD';

    return {
      country: countryCode,
      region: 'GLOBAL',
      currency: currency as any,
      paymentGateway: 'STRIPE',
      locale: this.getLocaleForCountry(countryCode),
      timezone: geoData?.timezone || 'UTC'
    };
  }

  /**
   * 국가별 로케일 반환
   */
  private getLocaleForCountry(countryCode: string): string {
    const localeMap: Record<string, string> = {
      'KR': 'ko-KR',
      'US': 'en-US',
      'GB': 'en-GB',
      'JP': 'ja-JP',
      'CN': 'zh-CN',
      'FR': 'fr-FR',
      'DE': 'de-DE',
      'ES': 'es-ES',
      'IT': 'it-IT'
    };

    return localeMap[countryCode] || 'en-US';
  }

  /**
   * 기본 위치 정보 (미국)
   */
  private getDefaultLocation(): UserLocation {
    return {
      country: 'US',
      region: 'GLOBAL',
      currency: 'USD',
      paymentGateway: 'STRIPE',
      locale: 'en-US',
      timezone: 'America/New_York'
    };
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(key: string): boolean {
    const timestamp = Date.now();
    const cacheTime = parseInt(key.split('_')[1] || '0');
    return timestamp - cacheTime < this.cacheExpiry;
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 서버사이드에서 사용할 IP 추출
   */
  static extractIPFromRequest(request: any): string | null {
    // Next.js API Route의 경우
    const forwarded = request.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : request.socket?.remoteAddress;
    
    // IPv6 localhost를 IPv4로 변환
    if (ip === '::1') return '127.0.0.1';
    
    return ip || null;
  }
}

// 싱글톤 인스턴스 export
export const locationDetector = LocationDetector.getInstance();