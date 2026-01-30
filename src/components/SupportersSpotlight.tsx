import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Loader2 } from 'lucide-react';

interface Supporter {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  thank_you_text: string;
  sort_order: number;
}

const SupportersSpotlight = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch active supporters from database
  const { data: supporters = [], isLoading } = useQuery({
    queryKey: ['supporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supporters')
        .select('id, name, handle, avatar_url, thank_you_text, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Supporter[];
    },
  });

  // Timer key to reset interval on user interaction
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    if (isPaused || supporters.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % supporters.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, supporters.length, timerKey]);

  // Reset index if supporters change
  useEffect(() => {
    if (currentIndex >= supporters.length && supporters.length > 0) {
      setCurrentIndex(0);
    }
  }, [supporters.length, currentIndex]);

  // Reset timer when navigating manually
  const resetTimer = () => {
    setTimerKey((prev) => prev + 1);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + supporters.length) % supporters.length);
    resetTimer();
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % supporters.length);
    resetTimer();
  };

  // Generate initials for placeholder avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-xs">
        <div className="neon-card p-4 flex items-center justify-center h-[140px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // No supporters - show placeholder
  if (supporters.length === 0) {
    return (
      <div className="w-full max-w-xs">
        <div className="neon-card p-4 flex flex-col items-center justify-center h-[140px] text-center">
          <Heart className="w-6 h-6 text-primary/40 mb-2" />
          <p className="text-xs text-muted-foreground">قريباً سيتم عرض الداعمين هنا</p>
        </div>
      </div>
    );
  }

  const currentSupporter = supporters[currentIndex];

  if (!currentSupporter) return null;

  return (
    <div 
      className="w-full max-w-xs relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      {/* Main Card - fixed height to prevent layout shift */}
      <div className="neon-card p-4 relative overflow-hidden min-h-[140px]">
        {/* Heart decoration */}
        <motion.div 
          className="absolute top-2 left-2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Heart className="w-4 h-4 text-primary fill-primary/30" />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSupporter.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <div className="relative mb-3">
              {currentSupporter.avatar_url ? (
                <img 
                  src={currentSupporter.avatar_url} 
                  alt={currentSupporter.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/40"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">{getInitials(currentSupporter.name)}</span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success border-2 border-card" />
            </div>

            {/* Name & Username */}
            <h4 className="text-sm font-bold text-foreground mb-0.5">{currentSupporter.name}</h4>
            <p className="text-xs text-primary font-medium mb-2">{currentSupporter.handle}</p>

            {/* Thank you message - max 2 lines with ellipsis */}
            <p className="text-[10px] text-muted-foreground leading-relaxed px-2 line-clamp-2">
              {currentSupporter.thank_you_text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {supporters.length > 1 && (
          <>
            <button 
              onClick={goToPrevious}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={goToNext}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {supporters.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {supporters.length > 6 ? (
            // Compact indicator for many items
            <>
              {[...Array(3)].map((_, i) => {
                const dotIndex = currentIndex <= 1 ? i : 
                                currentIndex >= supporters.length - 2 ? supporters.length - 3 + i : 
                                currentIndex - 1 + i;
                return (
                  <button
                    key={dotIndex}
                    onClick={() => setCurrentIndex(dotIndex)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      currentIndex === dotIndex 
                        ? 'bg-primary w-4 shadow-[0_0_8px_hsl(var(--primary))]' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                );
              })}
              <span className="text-[8px] text-muted-foreground mx-1">{currentIndex + 1}/{supporters.length}</span>
            </>
          ) : (
            // Full dots for fewer items
            supporters.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentIndex === i 
                    ? 'bg-primary w-4 shadow-[0_0_8px_hsl(var(--primary))]' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SupportersSpotlight;
