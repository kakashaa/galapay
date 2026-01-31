import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ghala_life_tracking_codes';

export type RequestType = 'payout' | 'instant' | 'ban_report' | 'special_id' | 'coins';

interface SavedRequest {
  trackingCode: string;
  createdAt: string;
  type: RequestType;
  // Optional metadata for different request types
  galaId?: string; // For ban reports and special ID requests
}

export const useSavedRequests = () => {
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old format (without type) to new format
        const migrated = parsed.map((r: any) => ({
          ...r,
          type: r.type || 'payout', // Default to payout for old entries
        }));
        setSavedRequests(migrated);
      }
    } catch (error) {
      console.error('Error loading saved requests:', error);
    }
  }, []);

  // Save a new tracking code with type
  const saveTrackingCode = useCallback((trackingCode: string, type: RequestType = 'payout', galaId?: string) => {
    const newRequest: SavedRequest = {
      trackingCode,
      createdAt: new Date().toISOString(),
      type,
      galaId,
    };

    setSavedRequests((prev) => {
      // Check if already exists
      if (prev.some((r) => r.trackingCode === trackingCode)) {
        return prev;
      }
      const updated = [newRequest, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove a tracking code
  const removeTrackingCode = useCallback((trackingCode: string) => {
    setSavedRequests((prev) => {
      const updated = prev.filter((r) => r.trackingCode !== trackingCode);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear all saved requests
  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedRequests([]);
  }, []);

  // Filter by type
  const getRequestsByType = useCallback((type: RequestType) => {
    return savedRequests.filter((r) => r.type === type);
  }, [savedRequests]);

  return {
    savedRequests,
    saveTrackingCode,
    removeTrackingCode,
    clearAll,
    getRequestsByType,
    hasSavedRequests: savedRequests.length > 0,
  };
};
