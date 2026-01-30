import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react';

interface Supporter {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  message?: string;
}

// Sample supporters data - can be replaced with real data from database
const supporters: Supporter[] = [
  { id: '1', name: 'أحمد محمد', username: '@ahmed_m', message: 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف' },
  { id: '2', name: 'سارة علي', username: '@sara_ali', message: 'نقدر دعمك الكريم ❤️' },
  { id: '3', name: 'خالد العمري', username: '@khaled99', message: 'شكرًا لثقتك في غلا لايف' },
  { id: '4', name: 'فاطمة حسن', username: '@fatima_h', message: 'دعمك يعني لنا الكثير 🌟' },
  { id: '5', name: 'عبدالله سعد', username: '@abdullah_s', message: 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف' },
  { id: '6', name: 'نورة خالد', username: '@noura_k', message: 'نقدر وجودك معنا 💚' },
  { id: '7', name: 'محمد الحربي', username: '@moh_harbi', message: 'شكرًا لدعمك المستمر' },
  { id: '8', name: 'ريم أحمد', username: '@reem_a', message: 'دعمك يحفزنا للأفضل ⭐' },
  { id: '9', name: 'سلطان العتيبي', username: '@sultan_o', message: 'شكرًا جزيلًا لثقتك' },
  { id: '10', name: 'هند محمد', username: '@hind_m', message: 'نقدر دعمك الكريم 🙏' },
  { id: '11', name: 'ياسر الشهري', username: '@yasser_sh', message: 'شكرًا لكونك جزءًا من غلا' },
  { id: '12', name: 'منى سالم', username: '@mona_s', message: 'دعمك يصنع الفرق 💪' },
];

const SupportersSpotlight = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % supporters.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + supporters.length) % supporters.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % supporters.length);
  };

  const currentSupporter = supporters[currentIndex];

  // Generate initials for placeholder avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <div 
      className="w-full max-w-xs relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      {/* Main Card */}
      <div className="neon-card p-4 relative overflow-hidden">
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <div className="relative mb-3">
              {currentSupporter.avatarUrl ? (
                <img 
                  src={currentSupporter.avatarUrl} 
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
            <p className="text-xs text-primary font-medium mb-2">{currentSupporter.username}</p>

            {/* Thank you message */}
            <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
              {currentSupporter.message || 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
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
      </div>

      {/* Dots Indicator */}
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
    </div>
  );
};

export default SupportersSpotlight;
