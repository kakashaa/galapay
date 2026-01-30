import { motion } from 'framer-motion';
import { Heart, Crown, Sparkles } from 'lucide-react';

const TopSpotlightBoxes = () => {
  // Placeholder avatars for coming soon state
  const placeholderAvatars = [1, 2, 3, 4, 5];

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
          <div className="flex flex-col items-center gap-2 mb-3">
            {/* Row 1: 2 avatars */}
            <div className="flex gap-2">
              {placeholderAvatars.slice(0, 2).map((_, index) => (
                <motion.div
                  key={`supporter-${index}`}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 0 0 hsla(var(--primary) / 0.3)',
                      '0 0 10px 2px hsla(var(--primary) / 0.4)',
                      '0 0 0 0 hsla(var(--primary) / 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                >
                  <span className="text-[10px] text-primary/60">?</span>
                </motion.div>
              ))}
            </div>
            {/* Row 2: 2 avatars */}
            <div className="flex gap-2">
              {placeholderAvatars.slice(2, 4).map((_, index) => (
                <motion.div
                  key={`supporter-${index + 2}`}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 0 0 hsla(var(--primary) / 0.3)',
                      '0 0 10px 2px hsla(var(--primary) / 0.4)',
                      '0 0 0 0 hsla(var(--primary) / 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: (index + 2) * 0.3 }}
                >
                  <span className="text-[10px] text-primary/60">?</span>
                </motion.div>
              ))}
            </div>
            {/* Row 3: 1 avatar centered */}
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsla(var(--primary) / 0.3)',
                  '0 0 10px 2px hsla(var(--primary) / 0.4)',
                  '0 0 0 0 hsla(var(--primary) / 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            >
              <span className="text-[10px] text-primary/60">?</span>
            </motion.div>
          </div>

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

          {/* Avatar Grid */}
          <div className="flex flex-col items-center gap-2 mb-3">
            {/* Row 1: 2 avatars */}
            <div className="flex gap-2">
              {placeholderAvatars.slice(0, 2).map((_, index) => (
                <motion.div
                  key={`host-${index}`}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 border border-warning/40 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 0 0 hsla(var(--warning) / 0.3)',
                      '0 0 10px 2px hsla(var(--warning) / 0.4)',
                      '0 0 0 0 hsla(var(--warning) / 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                >
                  <span className="text-[10px] text-warning/60">?</span>
                </motion.div>
              ))}
            </div>
            {/* Row 2: 2 avatars */}
            <div className="flex gap-2">
              {placeholderAvatars.slice(2, 4).map((_, index) => (
                <motion.div
                  key={`host-${index + 2}`}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 border border-warning/40 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 0 0 hsla(var(--warning) / 0.3)',
                      '0 0 10px 2px hsla(var(--warning) / 0.4)',
                      '0 0 0 0 hsla(var(--warning) / 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: (index + 2) * 0.3 }}
                >
                  <span className="text-[10px] text-warning/60">?</span>
                </motion.div>
              ))}
            </div>
            {/* Row 3: 1 avatar centered */}
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 border border-warning/40 flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsla(var(--warning) / 0.3)',
                  '0 0 10px 2px hsla(var(--warning) / 0.4)',
                  '0 0 0 0 hsla(var(--warning) / 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            >
              <span className="text-[10px] text-warning/60">?</span>
            </motion.div>
          </div>

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
