import { useNavigate } from 'react-router-dom';
import { Headphones, UserX, Crown, Users, Star, Gift, Wallet } from 'lucide-react';

interface ServiceIcon {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  comingSoon: boolean;
  path?: string;
}

const services: ServiceIcon[] = [
  {
    id: 'support',
    name: 'الدعم الفني',
    icon: <Headphones className="w-7 h-7 text-white" />,
    gradient: 'from-blue-500 to-blue-600',
    comingSoon: true,
  },
  {
    id: 'ban',
    name: 'تبنيد مستخدم',
    icon: <UserX className="w-7 h-7 text-white" />,
    gradient: 'from-red-500 to-red-600',
    comingSoon: false,
    path: '/ban-report',
  },
  {
    id: 'vip',
    name: 'طلب VIP',
    icon: <Crown className="w-7 h-7 text-white" />,
    gradient: 'from-yellow-500 to-amber-600',
    comingSoon: true,
  },
  {
    id: 'bd',
    name: 'فريق BD',
    icon: <Users className="w-7 h-7 text-white" />,
    gradient: 'from-purple-500 to-purple-600',
    comingSoon: true,
  },
  {
    id: 'special-id',
    name: 'ايدي مميز',
    icon: <Star className="w-7 h-7 text-white" />,
    gradient: 'from-orange-500 to-orange-600',
    comingSoon: false,
    path: '/special-id',
  },
  {
    id: 'celebrity-gift',
    name: 'هدية مشاهير',
    icon: <Gift className="w-7 h-7 text-white" />,
    gradient: 'from-pink-500 to-rose-600',
    comingSoon: true,
  },
  {
    id: 'wallet',
    name: 'محفظتي',
    icon: <Wallet className="w-7 h-7 text-white" />,
    gradient: 'from-emerald-500 to-emerald-600',
    comingSoon: true,
  },
];

export const ServiceIconsGrid = () => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full max-w-sm px-2">
      <div className="grid grid-cols-4 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            className="flex flex-col items-center gap-1.5 group"
            onClick={() => {
              if (service.path) {
                navigate(service.path);
              }
            }}
          >
            {/* iOS-style icon */}
            <div className="relative">
              <div 
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg transition-transform group-active:scale-95`}
              >
                {service.icon}
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
