import { useState, useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Target date: February 7, 2026 (first week of the new month)
const TARGET_DATE = new Date('2026-02-07T00:00:00');

const InstantPayoutCountdown = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = TARGET_DATE.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isExpired) {
    return null;
  }

  return (
    <div className="w-full max-w-sm z-10 mb-4">
      <div className="relative bg-warning/20 border border-warning/40 rounded-xl p-3 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-warning/10 via-warning/20 to-warning/10 animate-pulse" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-warning animate-pulse" />
            <span className="text-xs font-bold text-warning">السحب الفوري قريباً!</span>
            <Zap className="w-4 h-4 text-warning animate-pulse" />
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-1 mb-2" dir="ltr">
            <div className="flex flex-col items-center bg-background/80 rounded-lg px-2 py-1 min-w-[40px]">
              <span className="text-lg font-bold text-warning">{timeLeft.days}</span>
              <span className="text-[8px] text-muted-foreground">يوم</span>
            </div>
            <span className="text-warning font-bold">:</span>
            <div className="flex flex-col items-center bg-background/80 rounded-lg px-2 py-1 min-w-[40px]">
              <span className="text-lg font-bold text-warning">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[8px] text-muted-foreground">ساعة</span>
            </div>
            <span className="text-warning font-bold">:</span>
            <div className="flex flex-col items-center bg-background/80 rounded-lg px-2 py-1 min-w-[40px]">
              <span className="text-lg font-bold text-warning">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[8px] text-muted-foreground">دقيقة</span>
            </div>
            <span className="text-warning font-bold">:</span>
            <div className="flex flex-col items-center bg-background/80 rounded-lg px-2 py-1 min-w-[40px]">
              <span className="text-lg font-bold text-warning">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[8px] text-muted-foreground">ثانية</span>
            </div>
          </div>

          {/* Message */}
          <p className="text-[10px] text-center text-muted-foreground">
            خدمة بيع الراتب الفوري تبدأ من أول أسبوع بالشهر الجديد
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstantPayoutCountdown;
