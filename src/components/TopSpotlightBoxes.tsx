import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Supporter {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  thank_you_text: string;
  ai_praise_text: string | null;
}

interface Host {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  thank_you_text: string;
  ai_praise_text: string | null;
}

const TopSpotlightBoxes = () => {
  const [supporterIndex, setSupporterIndex] = useState(0);
  const [hostIndex, setHostIndex] = useState(0);

  // Fetch real supporters from database
  const { data: supporters = [], isLoading: loadingSupporters } = useQuery({
    queryKey: ['top-supporters-spotlight'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supporters')
        .select('id, name, handle, avatar_url, thank_you_text, ai_praise_text')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as Supporter[];
    },
  });

  // Fetch real hosts from database
  const { data: hosts = [], isLoading: loadingHosts } = useQuery({
    queryKey: ['top-hosts-spotlight'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hosts')
        .select('id, name, handle, avatar_url, thank_you_text, ai_praise_text')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as Host[];
    },
  });

  // Auto-rotate supporters every 5 seconds
  useEffect(() => {
    if (supporters.length === 0) return;
    
    const interval = setInterval(() => {
      setSupporterIndex((prev) => (prev + 1) % supporters.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [supporters.length]);

  // Auto-rotate hosts every 5 seconds
  useEffect(() => {
    if (hosts.length === 0) return;
    
    const interval = setInterval(() => {
      setHostIndex((prev) => (prev + 1) % hosts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [hosts.length]);

  // Get initials for placeholder
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const currentSupporter = supporters[supporterIndex];
  const currentHost = hosts[hostIndex];

  return (
    <div className="w-full px-2">
      {/* Side by Side Boxes */}
      <div className="flex items-start gap-4">

        {/* Top Supporters Box - Right Side */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1"
        >
          {/* Header - Outside box */}
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Heart className="w-3 h-3 text-destructive fill-destructive" />
            <h3 className="text-[10px] font-bold text-foreground">أفضل الداعمين</h3>
          </div>

          {/* Box Content - Fixed height */}
          <div className="neon-card p-2 h-[115px] flex flex-col justify-between">
            {/* Supporter Display */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {loadingSupporters ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : supporters.length === 0 ? (
                <>
                  <div className="relative flex-shrink-0">
                    <motion.div 
                      className="absolute inset-0 bg-primary/40 rounded-full blur-lg"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center">
                      <span className="text-sm text-primary/60">?</span>
                    </div>
                  </div>
                  <div className="text-center w-full mt-1">
                    <p className="text-[9px] text-primary font-semibold">@coming_soon</p>
                    <h4 className="text-[10px] font-bold text-foreground">قريباً...</h4>
                    <p className="text-[8px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                      سيتم الإعلان عن أفضل الداعمين قريباً
                    </p>
                  </div>
                </>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSupporter?.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full flex flex-col items-center gap-1"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <motion.div 
                        className="absolute inset-0 bg-primary/40 rounded-full blur-lg"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {currentSupporter?.avatar_url ? (
                        <img 
                          src={currentSupporter.avatar_url} 
                          alt={currentSupporter.name}
                          className="relative w-9 h-9 rounded-full object-cover border-2 border-primary/60 shadow-lg shadow-primary/30"
                        />
                      ) : (
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                          <span className="text-primary font-bold text-xs">{currentSupporter && getInitials(currentSupporter.name)}</span>
                        </div>
                      )}
                      {/* Click indicator */}
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-warning rounded-full flex items-center justify-center border border-card"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Sparkles className="w-2 h-2 text-warning-foreground" />
                      </motion.div>
                    </div>

                    {/* Info - Vertical layout */}
                    <div className="text-center w-full">
                      <p className="text-[9px] text-primary font-semibold truncate">
                        {currentSupporter?.handle}
                      </p>
                      <h4 className="text-[10px] font-bold text-foreground truncate">
                        {currentSupporter?.name}
                      </h4>
                      <p className="text-[8px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                        {currentSupporter?.thank_you_text}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Counter dots */}
            {supporters.length > 1 && (
              <div className="flex justify-center gap-0.5 mt-1">
                {supporters.slice(0, Math.min(supporters.length, 5)).map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      supporterIndex % Math.min(supporters.length, 5) === index 
                        ? 'bg-primary w-2' 
                        : 'bg-muted-foreground/30 w-0.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Hosts Box - Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1"
        >
          {/* Header - Outside box */}
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Crown className="w-3 h-3 text-warning fill-warning/30" />
            <h3 className="text-[10px] font-bold text-foreground">أفضل المضيفات</h3>
          </div>

          {/* Box Content - Fixed height same as supporters */}
          <div className="neon-card p-2 h-[115px] flex flex-col justify-between">
            {/* Host Display */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {loadingHosts ? (
                <Loader2 className="w-5 h-5 animate-spin text-warning" />
              ) : hosts.length === 0 ? (
                <>
                  <div className="relative flex-shrink-0">
                    <motion.div 
                      className="absolute inset-0 bg-warning/40 rounded-full blur-lg"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 border-2 border-warning/40 flex items-center justify-center">
                      <span className="text-sm text-warning/60">?</span>
                    </div>
                  </div>
                  <div className="text-center w-full mt-1">
                    <p className="text-[9px] text-warning font-semibold">@coming_soon</p>
                    <h4 className="text-[10px] font-bold text-foreground">قريباً...</h4>
                    <p className="text-[8px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                      سيتم الإعلان عن أفضل المضيفات قريباً
                    </p>
                  </div>
                </>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentHost?.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full flex flex-col items-center gap-1"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <motion.div 
                        className="absolute inset-0 bg-warning/40 rounded-full blur-lg"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {currentHost?.avatar_url ? (
                        <img 
                          src={currentHost.avatar_url} 
                          alt={currentHost.name}
                          className="relative w-9 h-9 rounded-full object-cover border-2 border-warning/60 shadow-lg shadow-warning/30"
                        />
                      ) : (
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-warning/40 to-warning/20 border-2 border-warning/60 flex items-center justify-center shadow-lg shadow-warning/30">
                          <span className="text-warning font-bold text-xs">{currentHost && getInitials(currentHost.name)}</span>
                        </div>
                      )}
                      {/* Crown indicator */}
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-warning rounded-full flex items-center justify-center border border-card"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Crown className="w-2 h-2 text-warning-foreground fill-current" />
                      </motion.div>
                    </div>

                    {/* Info - Vertical layout */}
                    <div className="text-center w-full">
                      <p className="text-[9px] text-warning font-semibold truncate">
                        {currentHost?.handle}
                      </p>
                      <h4 className="text-[10px] font-bold text-foreground truncate">
                        {currentHost?.name}
                      </h4>
                      <p className="text-[8px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                        {currentHost?.thank_you_text}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Counter dots */}
            {hosts.length > 1 && (
              <div className="flex justify-center gap-0.5 mt-1">
                {hosts.slice(0, Math.min(hosts.length, 5)).map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      hostIndex % Math.min(hosts.length, 5) === index 
                        ? 'bg-warning w-2' 
                        : 'bg-muted-foreground/30 w-0.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default TopSpotlightBoxes;
