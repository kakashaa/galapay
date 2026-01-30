// Haptic feedback and sound effects for touch interactions

// Singleton AudioContext to prevent creating multiple contexts
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (required after user interaction on mobile)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  } catch (e) {
    return null;
  }
};

// Simple pop sound using Web Audio API
const createPopSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Audio playback failed - silently ignore
  }
};

// Haptic vibration for mobile devices
const triggerHaptic = (pattern: number | number[] = 10) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Vibration not supported - silently ignore
  }
};

export const useTapFeedback = () => {
  const triggerFeedback = (options?: { sound?: boolean; haptic?: boolean }) => {
    const { sound = true, haptic = true } = options || {};
    
    if (sound) {
      createPopSound();
    }
    
    if (haptic) {
      triggerHaptic([5, 20, 5]); // Short double tap pattern
    }
  };

  return { triggerFeedback };
};

export default useTapFeedback;
