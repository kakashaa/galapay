import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Crown, Sparkles, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  ai_praise_text: string | null;
}

const TopSpotlightBoxes = () => {
  const [supporterIndex, setSupporterIndex] = useState(0);
  const [hostIndex, setHostIndex] = useState(0);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

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

  // Placeholder hosts (will be replaced with real data later)
  const hosts: Host[] = [];

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
    <div className="w-full max-w-md px-4 space-y-3">
      {/* Top Supporters Box - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="neon-card p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-destructive fill-destructive" />
          <h3 className="text-sm font-bold text-foreground">أفضل الداعمين</h3>
        </div>

        {/* Supporter Display */}
        {loadingSupporters ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : supporters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center mb-3"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsla(var(--primary) / 0.3)',
                  '0 0 20px 5px hsla(var(--primary) / 0.4)',
                  '0 0 0 0 hsla(var(--primary) / 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-2xl text-primary/60">?</span>
            </motion.div>
            <span className="text-sm text-muted-foreground">قريباً...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.button
              key={currentSupporter?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={() => currentSupporter && setSelectedSupporter(currentSupporter)}
              className="w-full flex items-center gap-4 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <motion.div 
                  className="absolute inset-0 bg-primary/40 rounded-full blur-xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {currentSupporter?.avatar_url ? (
                  <img 
                    src={currentSupporter.avatar_url} 
                    alt={currentSupporter.name}
                    className="relative w-16 h-16 rounded-full object-cover border-2 border-primary/60 shadow-lg shadow-primary/30"
                  />
                ) : (
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="text-primary font-bold text-lg">{currentSupporter && getInitials(currentSupporter.name)}</span>
                  </div>
                )}
                {/* Click indicator */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-warning rounded-full flex items-center justify-center border-2 border-card"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-3 h-3 text-warning-foreground" />
                </motion.div>
              </div>

              {/* Info */}
              <div className="flex-1 text-right min-w-0">
                <h4 className="text-base font-bold text-foreground mb-0.5 truncate">
                  {currentSupporter?.name}
                </h4>
                <p className="text-xs text-primary font-semibold mb-2">
                  {currentSupporter?.handle}
                </p>
                {/* Thank you message - visible directly */}
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {currentSupporter?.thank_you_text}
                </p>
              </div>
            </motion.button>
          </AnimatePresence>
        )}

        {/* Counter dots */}
        {supporters.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {supporters.slice(0, Math.min(supporters.length, 6)).map((_, index) => (
              <motion.div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  supporterIndex % Math.min(supporters.length, 6) === index 
                    ? 'bg-primary w-4' 
                    : 'bg-muted-foreground/30 w-1.5'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Top Hosts Box - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="neon-card p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-warning fill-warning/30" />
          <h3 className="text-sm font-bold text-foreground">أفضل المضيفات</h3>
        </div>

        {/* Host Display - Placeholder for now */}
        <div className="flex flex-col items-center justify-center py-6">
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 border-2 border-warning/40 flex items-center justify-center mb-3"
            animate={{ 
              boxShadow: [
                '0 0 0 0 hsla(var(--warning) / 0.3)',
                '0 0 20px 5px hsla(var(--warning) / 0.4)',
                '0 0 0 0 hsla(var(--warning) / 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-xl text-warning/60">?</span>
          </motion.div>
          <span className="text-sm text-muted-foreground mb-2">قريباً...</span>
          <motion.div
            className="flex items-center gap-1.5 text-xs text-warning"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" />
            <span>نعلن عن أفضل 10</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Supporter Praise Dialog */}
      <Dialog open={!!selectedSupporter} onOpenChange={() => setSelectedSupporter(null)}>
        <DialogContent className="max-w-sm mx-auto bg-card/95 backdrop-blur-xl border-primary/30 p-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedSupporter(null)}
              className="absolute top-3 left-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8 text-center">
              {/* Avatar with glow */}
              <motion.div 
                className="relative inline-block mb-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-primary/40 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {selectedSupporter?.avatar_url ? (
                  <img 
                    src={selectedSupporter.avatar_url} 
                    alt={selectedSupporter.name}
                    className="relative w-20 h-20 rounded-full object-cover border-3 border-primary/60 shadow-2xl shadow-primary/30"
                  />
                ) : (
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-3 border-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30">
                    <span className="text-primary font-bold text-xl">{selectedSupporter && getInitials(selectedSupporter.name)}</span>
                  </div>
                )}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <Heart className="w-3 h-3 text-primary-foreground fill-current" />
                </motion.div>
              </motion.div>

              {/* Name and Handle */}
              <motion.h3 
                className="text-lg font-bold text-foreground mb-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {selectedSupporter?.name}
              </motion.h3>
              <motion.p 
                className="text-sm text-primary font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {selectedSupporter?.handle}
              </motion.p>
            </div>

            {/* AI Praise Content */}
            <div className="p-5 pt-0 -mt-4">
              <motion.div
                className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-4 border border-primary/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* AI Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-[10px] font-bold"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>رسالة من الذكاء الاصطناعي</span>
                  </motion.div>
                </div>

                {/* Praise Text */}
                <motion.p
                  className="text-sm text-foreground leading-relaxed text-right"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {selectedSupporter?.ai_praise_text || 'شكراً جزيلاً لدعمك الكبير لتطبيق غلا لايف! أنت من أفضل الداعمين ❤️'}
                </motion.p>
              </motion.div>

              {/* Thank you footer */}
              <motion.div
                className="text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-muted-foreground">
                  شكراً لدعمك الكبير لتطبيق غلا لايف ❤️
                </p>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Host Praise Dialog - Will be implemented when host data is ready */}
      <Dialog open={!!selectedHost} onOpenChange={() => setSelectedHost(null)}>
        <DialogContent className="max-w-sm mx-auto bg-card/95 backdrop-blur-xl border-warning/30 p-0 overflow-hidden">
          {/* Similar structure as supporter dialog but with warning colors */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 text-center"
          >
            <Crown className="w-12 h-12 text-warning mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">قريباً!</h3>
            <p className="text-sm text-muted-foreground">سيتم الإعلان عن أفضل المضيفات قريباً</p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopSpotlightBoxes;
