import { motion } from 'framer-motion';
import { Heart, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Supporter {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
}

interface Host {
  id: string;
  name: string;
  avatar_url: string | null;
}

const TopSpotlightBoxes = () => {
  const navigate = useNavigate();

  // Fetch real supporters from database
  const { data: supporters = [], isLoading: loadingSupporters } = useQuery({
    queryKey: ['top-supporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supporters')
        .select('id, name, handle, avatar_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data as Supporter[];
    },
  });

  // Placeholder hosts (will be replaced with real data later)
  const hosts: Host[] = [];
  const loadingHosts = false;

  // Get initials for placeholder
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  // Render avatar grid for supporters
  const renderSupporterAvatars = () => {
    if (loadingSupporters) {
      return (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      );
    }

    if (supporters.length === 0) {
      return renderPlaceholderAvatars('primary');
    }

    // Create rows: 2, 2, 1 pattern
    const row1 = supporters.slice(0, 2);
    const row2 = supporters.slice(2, 4);
    const row3 = supporters.slice(4, 5);

    return (
      <div className="flex flex-col items-center gap-2 mb-3">
        {/* Row 1 */}
        <div className="flex gap-2">
          {row1.map((supporter, index) => (
            <motion.button
              key={supporter.id}
              onClick={() => navigate(`/supporter/${supporter.id}`)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/60 shadow-lg shadow-primary/20"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsla(var(--primary) / 0.3)',
                  '0 0 10px 2px hsla(var(--primary) / 0.4)',
                  '0 0 0 0 hsla(var(--primary) / 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {supporter.avatar_url ? (
                <img 
                  src={supporter.avatar_url} 
                  alt={supporter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                  <span className="text-[10px] text-primary font-bold">{getInitials(supporter.name)}</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
        {/* Row 2 */}
        {row2.length > 0 && (
          <div className="flex gap-2">
            {row2.map((supporter, index) => (
              <motion.button
                key={supporter.id}
                onClick={() => navigate(`/supporter/${supporter.id}`)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/60 shadow-lg shadow-primary/20"
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 hsla(var(--primary) / 0.3)',
                    '0 0 10px 2px hsla(var(--primary) / 0.4)',
                    '0 0 0 0 hsla(var(--primary) / 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: (index + 2) * 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {supporter.avatar_url ? (
                  <img 
                    src={supporter.avatar_url} 
                    alt={supporter.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                    <span className="text-[10px] text-primary font-bold">{getInitials(supporter.name)}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
        {/* Row 3 */}
        {row3.length > 0 && row3.map((supporter) => (
          <motion.button
            key={supporter.id}
            onClick={() => navigate(`/supporter/${supporter.id}`)}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/60 shadow-lg shadow-primary/20"
            animate={{ 
              boxShadow: [
                '0 0 0 0 hsla(var(--primary) / 0.3)',
                '0 0 10px 2px hsla(var(--primary) / 0.4)',
                '0 0 0 0 hsla(var(--primary) / 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {supporter.avatar_url ? (
              <img 
                src={supporter.avatar_url} 
                alt={supporter.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                <span className="text-[10px] text-primary font-bold">{getInitials(supporter.name)}</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    );
  };

  // Render placeholder avatars
  const renderPlaceholderAvatars = (color: 'primary' | 'warning') => {
    const placeholderCount = 5;
    const row1 = [0, 1];
    const row2 = [2, 3];
    
    return (
      <div className="flex flex-col items-center gap-2 mb-3">
        <div className="flex gap-2">
          {row1.map((index) => (
            <motion.div
              key={`placeholder-${color}-${index}`}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                color === 'primary' 
                  ? 'from-primary/30 to-primary/10 border-primary/40' 
                  : 'from-warning/30 to-warning/10 border-warning/40'
              } border flex items-center justify-center`}
              animate={{ 
                boxShadow: [
                  `0 0 0 0 hsla(var(--${color}) / 0.3)`,
                  `0 0 10px 2px hsla(var(--${color}) / 0.4)`,
                  `0 0 0 0 hsla(var(--${color}) / 0.3)`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
            >
              <span className={`text-[10px] ${color === 'primary' ? 'text-primary/60' : 'text-warning/60'}`}>?</span>
            </motion.div>
          ))}
        </div>
        <div className="flex gap-2">
          {row2.map((index) => (
            <motion.div
              key={`placeholder-${color}-${index}`}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                color === 'primary' 
                  ? 'from-primary/30 to-primary/10 border-primary/40' 
                  : 'from-warning/30 to-warning/10 border-warning/40'
              } border flex items-center justify-center`}
              animate={{ 
                boxShadow: [
                  `0 0 0 0 hsla(var(--${color}) / 0.3)`,
                  `0 0 10px 2px hsla(var(--${color}) / 0.4)`,
                  `0 0 0 0 hsla(var(--${color}) / 0.3)`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
            >
              <span className={`text-[10px] ${color === 'primary' ? 'text-primary/60' : 'text-warning/60'}`}>?</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${
            color === 'primary' 
              ? 'from-primary/30 to-primary/10 border-primary/40' 
              : 'from-warning/30 to-warning/10 border-warning/40'
          } border flex items-center justify-center`}
          animate={{ 
            boxShadow: [
              `0 0 0 0 hsla(var(--${color}) / 0.3)`,
              `0 0 10px 2px hsla(var(--${color}) / 0.4)`,
              `0 0 0 0 hsla(var(--${color}) / 0.3)`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
        >
          <span className={`text-[10px] ${color === 'primary' ? 'text-primary/60' : 'text-warning/60'}`}>?</span>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm px-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Top Supporters Box - Right side for RTL */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="neon-card p-3 flex flex-col items-center"
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-3">
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
            <h3 className="text-xs font-bold text-foreground">أفضل الداعمين</h3>
          </div>

          {/* Avatar Grid */}
          {renderSupporterAvatars()}

          {/* Coming Soon Text */}
          <motion.div
            className="flex items-center gap-1 text-[10px] text-warning"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-3 h-3" />
            <span>اضغط للتفاصيل</span>
          </motion.div>
        </motion.div>

        {/* Top Hosts Box - Left side for RTL */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="neon-card p-3 flex flex-col items-center"
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-3">
            <Crown className="w-4 h-4 text-warning fill-warning/30" />
            <h3 className="text-xs font-bold text-foreground">أفضل المضيفات</h3>
          </div>

          {/* Avatar Grid - Placeholder for now */}
          {renderPlaceholderAvatars('warning')}

          {/* Coming Soon Text */}
          <motion.div
            className="flex items-center gap-1 text-[10px] text-warning"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-3 h-3" />
            <span>قريباً نعلن عن أفضل 10</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TopSpotlightBoxes;
