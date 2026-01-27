import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ghala_life_tracking_codes';

interface SavedRequest {
  trackingCode: string;
  createdAt: string;
}

export const useSavedRequests = () => {
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedRequests(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved requests:', error);
    }
  }, []);

  // Save a new tracking code
  const saveTrackingCode = useCallback((trackingCode: string) => {
    const newRequest: SavedRequest = {
      trackingCode,
      createdAt: new Date().toISOString(),
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

  return {
    savedRequests,
    saveTrackingCode,
    removeTrackingCode,
    clearAll,
    hasSavedRequests: savedRequests.length > 0,
  };
};
