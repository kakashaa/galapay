import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import MoreOptionsSheet from './MoreOptionsSheet';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface FloatingDockProps {
  items: NavItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isSuperAdmin?: boolean;
}

const FloatingDock = ({ items, activeTab, onSelectTab, isSuperAdmin }: FloatingDockProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      {/* Outer glow effect */}
      <div 
        className="absolute inset-0 rounded-[28px] blur-xl opacity-50 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, hsla(142, 76%, 50%, 0.3), hsla(150, 70%, 45%, 0.2))',
          transform: 'scale(1.1)',
        }}
      />
      
      {/* Main dock container */}
      <nav 
        className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-[24px]"
        style={{
          background: 'linear-gradient(180deg, hsla(150, 35%, 12%, 0.85) 0%, hsla(150, 40%, 8%, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid hsla(142, 70%, 45%, 0.25)',
          boxShadow: `
            0 8px 32px -8px hsla(150, 50%, 3%, 0.8),
            0 0 0 1px hsla(142, 70%, 45%, 0.1),
            inset 0 1px 0 hsla(255, 255%, 255%, 0.05),
            0 0 40px hsla(142, 76%, 50%, 0.15)
          `,
        }}
      >
        {/* Glass reflection effect */}
        <div 
          className="absolute inset-x-0 top-0 h-1/2 rounded-t-[24px] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, hsla(255, 255%, 255%, 0.08) 0%, transparent 100%)',
          }}
        />

        {items.map((item) => {
          const isActive = activeTab === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ease-out",
                isActive && "animate-mac-bounce",
                !isActive && isHovered && "scale-110 -translate-y-1"
              )}
              style={isActive ? {
                background: 'linear-gradient(135deg, hsl(142 76% 50%), hsl(150 70% 45%))',
                boxShadow: `
                  0 4px 20px hsla(142, 76%, 50%, 0.5),
                  0 0 30px hsla(142, 76%, 50%, 0.3),
                  inset 0 1px 0 hsla(255, 255%, 255%, 0.3)
                `,
              } : isHovered ? {
                background: 'hsla(142, 70%, 45%, 0.15)',
                boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.2)',
              } : undefined}
            >
              {/* Icon glow for active state */}
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-2xl animate-pulse"
                  style={{
                    background: 'radial-gradient(circle at center, hsla(142, 76%, 50%, 0.4) 0%, transparent 70%)',
                  }}
                />
              )}
              
              <item.icon 
                className={cn(
                  "w-5 h-5 relative z-10 transition-all duration-300",
                  isActive ? "text-primary-foreground scale-110" : "text-muted-foreground",
                  isHovered && !isActive && "text-primary scale-105"
                )} 
              />
              <span 
                className={cn(
                  "text-[9px] font-medium mt-0.5 relative z-10 transition-all duration-300",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                  isHovered && !isActive && "text-primary"
                )}
              >
                {item.label}
              </span>
              
              {/* Badge */}
              {item.badge && item.badge > 0 && !isActive && (
                <span 
                  className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] text-[9px] font-bold rounded-full flex items-center justify-center px-1"
                  style={{
                    background: 'linear-gradient(135deg, hsl(142 76% 50%), hsl(150 70% 45%))',
                    color: 'hsl(150 40% 4%)',
                    boxShadow: '0 2px 8px hsla(142, 76%, 50%, 0.5)',
                  }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              
              {/* Active indicator dot */}
              {isActive && (
                <div 
                  className="absolute -bottom-1 w-1 h-1 rounded-full"
                  style={{
                    background: 'hsl(142 76% 50%)',
                    boxShadow: '0 0 8px hsl(142 76% 50%)',
                  }}
                />
              )}
            </button>
          );
        })}
        
        {/* Separator line */}
        {isSuperAdmin && (
          <div 
            className="w-px h-10 mx-1"
            style={{
              background: 'linear-gradient(180deg, transparent, hsla(142, 70%, 45%, 0.3), transparent)',
            }}
          />
        )}
        
        {/* More Options Button - Only for Super Admin */}
        {isSuperAdmin && (
          <MoreOptionsSheet 
            activeTab={activeTab} 
            onSelectTab={onSelectTab} 
          />
        )}
      </nav>
    </div>
  );
};

export default FloatingDock;
