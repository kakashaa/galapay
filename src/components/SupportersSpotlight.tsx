import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

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
    }, 5000); // Changed to 5 seconds

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
      <div className="w-full flex items-center justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // No supporters - show placeholder
  if (supporters.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-muted-foreground">قريباً سيتم عرض الداعمين هنا ❤️</p>
      </div>
    );
  }

  const currentSupporter = supporters[currentIndex];

  if (!currentSupporter) return null;

  return (
    <div 
      className="w-full max-w-sm relative px-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSupporter.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="neon-card p-4 flex flex-col items-center text-center"
        >
          {/* Avatar with glow effect */}
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
            {currentSupporter.avatar_url ? (
              <img 
                src={currentSupporter.avatar_url} 
                alt={currentSupporter.name}
                className="relative w-16 h-16 rounded-full object-cover border-2 border-primary/60 shadow-lg shadow-primary/20"
              />
            ) : (
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary font-bold text-lg">{getInitials(currentSupporter.name)}</span>
              </div>
            )}
          </div>

          {/* Name */}
          <h4 className="text-sm font-bold text-foreground mb-0.5">{currentSupporter.name}</h4>
          
          {/* ID/Handle */}
          <p className="text-xs text-primary font-semibold mb-2">{currentSupporter.handle}</p>

          {/* Thank you message */}
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px] line-clamp-2">
            {currentSupporter.thank_you_text}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows - outside the content */}
      {supporters.length > 1 && (
        <>
          <button 
            onClick={goToPrevious}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            onClick={goToNext}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </>
      )}

      {/* Counter */}
      {supporters.length > 1 && (
        <div className="flex justify-center mt-3">
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {supporters.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default SupportersSpotlight;
