import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from './config';

interface CacheInfo {
  size: number;
  files: number;
  maxSize: number;
}

export function useCacheManager() {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    size: 0,
    files: 0,
    maxSize: 100 * 1024 * 1024 // 100MB limit
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCacheInfo = useCallback(async () => {
    try {
      setError(null);
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/cache/size`);
      
      setCacheInfo(prev => ({
        ...prev,
        size: response.data.size_bytes || 0,
        files: response.data.file_count || 0
      }));
    } catch (err) {
      setError('Failed to fetch cache information');
      console.error('Cache info fetch error:', err);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/cache/clear`);
      
      // Reset cache info
      setCacheInfo(prev => ({
        ...prev,
        size: 0,
        files: 0
      }));
      
      return true;
    } catch (err) {
      setError('Failed to clear cache');
      console.error('Cache clear error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getCacheUsagePercentage = useCallback((): number => {
    return (cacheInfo.size / cacheInfo.maxSize) * 100;
  }, [cacheInfo.size, cacheInfo.maxSize]);

  const isCacheNearLimit = useCallback((): boolean => {
    return getCacheUsagePercentage() > 80;
  }, [getCacheUsagePercentage]);

  const isCacheOverLimit = useCallback((): boolean => {
    return cacheInfo.size > cacheInfo.maxSize;
  }, [cacheInfo.size, cacheInfo.maxSize]);

  // Fetch cache info on mount and periodically
  useEffect(() => {
    fetchCacheInfo();
    const interval = setInterval(fetchCacheInfo, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchCacheInfo]);

  return {
    cacheInfo,
    isLoading,
    error,
    fetchCacheInfo,
    clearCache,
    formatBytes,
    getCacheUsagePercentage,
    isCacheNearLimit,
    isCacheOverLimit
  };
}