import { useState } from 'react';
import { 
  Clock, 
  Video, 
  Heart, 
  Shield, 
  Users,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface MoreOption {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

interface MoreOptionsSheetProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

const moreOptions: MoreOption[] = [
  { 
    id: 'my-requests', 
    icon: Clock, 
    label: 'طلباتي',
    description: 'عرض الطلبات التي عملت عليها'
  },
  { 
    id: 'videos', 
    icon: Video, 
    label: 'الفيديوهات',
    description: 'إدارة فيديوهات الشرح'
  },
  { 
    id: 'supporters', 
    icon: Heart, 
    label: 'الداعمين والمضيفين',
    description: 'إدارة الداعمين والمضيفين'
  },
  { 
    id: 'scan', 
    icon: Shield, 
    label: 'الفحص',
    description: 'فحص الطلبات المشبوهة'
  },
  { 
    id: 'settings', 
    icon: Users, 
    label: 'الإعدادات',
    description: 'إدارة المديرين والإعدادات العامة'
  },
];

const MoreOptionsSheet = ({ activeTab, onSelectTab }: MoreOptionsSheetProps) => {
  const [open, setOpen] = useState(false);

  const handleSelectOption = (tabId: string) => {
    onSelectTab(tabId);
    setOpen(false);
  };

  const isMoreActive = moreOptions.some(opt => opt.id === activeTab);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ease-out ${
            isMoreActive 
              ? 'animate-mac-bounce' 
              : 'text-muted-foreground hover:text-foreground hover:scale-110 hover:-translate-y-1'
          }`}
          style={isMoreActive ? {
            background: 'linear-gradient(135deg, hsl(142 76% 50%), hsl(150 70% 45%))',
            boxShadow: `
              0 4px 20px hsla(142, 76%, 50%, 0.5),
              0 0 30px hsla(142, 76%, 50%, 0.3),
              inset 0 1px 0 hsla(255, 255%, 255%, 0.3)
            `,
          } : undefined}
        >
          {isMoreActive && (
            <div 
              className="absolute inset-0 rounded-2xl animate-pulse"
              style={{
                background: 'radial-gradient(circle at center, hsla(142, 76%, 50%, 0.4) 0%, transparent 70%)',
              }}
            />
          )}
          <MoreHorizontal className={`w-5 h-5 relative z-10 transition-all duration-300 ${
            isMoreActive ? 'scale-110 text-primary-foreground' : ''
          }`} />
          <span className={`text-[9px] font-medium mt-0.5 relative z-10 ${isMoreActive ? 'text-primary-foreground' : ''}`}>
            المزيد
          </span>
          {isMoreActive && (
            <div 
              className="absolute -bottom-1 w-1 h-1 rounded-full"
              style={{
                background: 'hsl(142 76% 50%)',
                boxShadow: '0 0 8px hsl(142 76% 50%)',
              }}
            />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl border-t border-primary/20 bg-card">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">خيارات أخرى</SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="space-y-2 pb-6">
          {moreOptions.map((option) => {
            const isActive = activeTab === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/15 border border-primary/30' 
                    : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <option.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-right">
                  <p className={`font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MoreOptionsSheet;
