'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { UserLocation } from '@/src/lib/payment/types';
import { locationDetector } from '@/src/lib/payment/location-detector';

interface LocationSelectorProps {
  onLocationChange?: (location: UserLocation) => void;
  className?: string;
}

const LOCATIONS = [
  { value: 'KR', label: '대한민국', flag: '🇰🇷' },
  { value: 'US', label: 'United States', flag: '🇺🇸' },
  { value: 'JP', label: '日本', flag: '🇯🇵' },
  { value: 'CN', label: '中国', flag: '🇨🇳' },
  { value: 'EU', label: 'Europe', flag: '🇪🇺' },
];

export function LocationSelector({ onLocationChange, className }: LocationSelectorProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 초기 위치 감지
    locationDetector.detectUserLocation().then((location) => {
      setSelectedLocation(location.country);
      setIsLoading(false);
      onLocationChange?.(location);
    });
  }, []);

  const handleLocationChange = async (value: string) => {
    setSelectedLocation(value);
    
    // 사용자 선택 기반으로 위치 정보 업데이트
    const newLocation = await locationDetector.detectUserLocation(value);
    onLocationChange?.(newLocation);

    // 선택한 지역을 쿠키에 저장
    document.cookie = `user_location=${value}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30일
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Globe className="h-4 w-4 animate-pulse" />
        <span>위치 감지 중...</span>
      </div>
    );
  }

  return (
    <Select value={selectedLocation} onValueChange={handleLocationChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {LOCATIONS.find(loc => loc.value === selectedLocation)?.flag || '🌍'}
            <span className="ml-1">
              {LOCATIONS.find(loc => loc.value === selectedLocation)?.label || 'Select Location'}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LOCATIONS.map((location) => (
          <SelectItem key={location.value} value={location.value}>
            <div className="flex items-center gap-2">
              <span>{location.flag}</span>
              <span>{location.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}