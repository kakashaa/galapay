// Haptic feedback and sound effects for touch interactions

// Simple pop sound using Web Audio API
const createPopSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported
  }
};

// Haptic vibration for mobile devices
const triggerHaptic = (pattern: number | number[] = 10) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Vibration not supported
  }
};

export const useTapFeedback = () => {
  const triggerFeedback = (options?: { sound?: boolean; haptic?: boolean }) => {
    const { sound = true, haptic = true } = options || {};
    
    if (sound) {
      createPopSound();
    }
    
    if (haptic) {
      triggerHaptic([5, 30, 5]); // Short double tap pattern
    }
  };

  return { triggerFeedback };
};

export default useTapFeedback;
