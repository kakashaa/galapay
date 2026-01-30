import { motion, type Transition } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  press?: boolean;
  variant?: 'default' | 'glow' | 'neon';
}

const transition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export const AnimatedCard = ({
  children,
  className = '',
  delay = 0,
  hover = true,
  press = true,
  variant = 'default',
}: AnimatedCardProps) => {
  const variantClasses = {
    default: 'glass-card',
    glow: 'glass-card-hover',
    neon: 'neon-card',
  };

  return (
    <motion.div
      className={`${variantClasses[variant]} ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...transition, delay }}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      whileTap={press ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
};

// Individual list item
export const AnimatedListItem = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// Fade in component for sections - with forwardRef support
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className = '', delay = 0, direction = 'up' }, ref) => {
    const directionOffset = {
      up: { y: 30, x: 0 },
      down: { y: -30, x: 0 },
      left: { y: 0, x: 30 },
      right: { y: 0, x: -30 },
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{
          opacity: 0,
          ...directionOffset[direction],
        }}
        animate={{
          opacity: 1,
          y: 0,
          x: 0,
        }}
        transition={{
          duration: 0.5,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {children}
      </motion.div>
    );
  }
);

FadeIn.displayName = 'FadeIn';

// Pulse animation for important elements
export const PulseGlow = ({
  children,
  className = '',
  color = 'primary',
}: {
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'warning' | 'success' | 'destructive';
}) => {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        boxShadow: [
          `0 0 20px hsla(var(--${color}) / 0.3)`,
          `0 0 40px hsla(var(--${color}) / 0.5)`,
          `0 0 20px hsla(var(--${color}) / 0.3)`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};
