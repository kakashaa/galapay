import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, UserX, Crown, Users, Star, Gift, Wallet, LucideIcon } from 'lucide-react';
import { useTapFeedback } from '@/hooks/use-haptic-feedback';

interface ServiceIcon {
  id: string;
  name: string;
  Icon: LucideIcon;
  gradient: string;
  comingSoon: boolean;
  path?: string;
}

const services: ServiceIcon[] = [
  {
    id: 'support',
    name: 'الدعم الفني',
    Icon: Headphones,
    gradient: 'from-blue-500 to-blue-600',
    comingSoon: true,
  },
  {
    id: 'ban',
    name: 'تبنيد مستخدم',
    Icon: UserX,
    gradient: 'from-red-500 to-red-600',
    comingSoon: false,
    path: '/ban-report',
  },
  {
    id: 'vip',
    name: 'طلب VIP',
    Icon: Crown,
    gradient: 'from-yellow-500 to-amber-600',
    comingSoon: true,
  },
  {
    id: 'bd',
    name: 'فريق BD',
    Icon: Users,
    gradient: 'from-purple-500 to-purple-600',
    comingSoon: true,
  },
  {
    id: 'special-id',
    name: 'ايدي مميز',
    Icon: Star,
    gradient: 'from-orange-500 to-orange-600',
    comingSoon: false,
    path: '/special-id',
  },
  {
    id: 'celebrity-gift',
    name: 'هدية مشاهير',
    Icon: Gift,
    gradient: 'from-pink-500 to-rose-600',
    comingSoon: true,
  },
  {
    id: 'wallet',
    name: 'محفظتي',
    Icon: Wallet,
    gradient: 'from-emerald-500 to-emerald-600',
    comingSoon: true,
  },
];

export const ServiceIconsGrid = () => {
  const navigate = useNavigate();
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const { triggerFeedback } = useTapFeedback();
  
  const handleClick = (service: ServiceIcon) => {
    setBouncingId(service.id);
    triggerFeedback({ sound: true, haptic: true });
    setTimeout(() => setBouncingId(null), 400);
    
    if (service.path) {
      setTimeout(() => navigate(service.path!), 200);
    }
  };
  
  return (
    <div className="w-full max-w-sm px-2">
      <div className="grid grid-cols-4 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            className="flex flex-col items-center gap-1.5 group"
            onClick={() => handleClick(service)}
          >
            {/* iOS-style icon */}
            <div className="relative">
              <div 
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg transition-transform group-active:scale-95 ${bouncingId === service.id ? 'animate-mac-bounce' : ''}`}
              >
                <service.Icon className="w-7 h-7 text-white" />
              </div>
              {/* Coming Soon Badge */}
              {service.comingSoon && (
                <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-destructive text-black text-[8px] font-bold rounded-full shadow-sm animate-pulse">
                  قريباً
                </div>
              )}
            </div>
            {/* Label */}
            <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
              {service.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
