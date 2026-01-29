import { useState, useEffect } from 'react';
import { Play, X, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

export const VideoStoryCircle = () => {
  const [video, setVideo] = useState<VideoTutorial | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !video) return null;

  return (
    <>
      {/* Story Circle Button */}
      <div className="flex flex-col items-center gap-2 z-10">
        <button
          onClick={() => setIsOpen(true)}
          className="relative group"
        >
          {/* Gradient Ring - Story Style */}
          <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-primary via-accent to-warning">
            <div className="w-full h-full rounded-full bg-background p-[2px]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Play Badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
            <Play className="w-3.5 h-3.5 text-primary-foreground fill-current" />
          </div>
          
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
        </button>
        
        {/* Title */}
        <span className="text-sm font-medium text-foreground">
          {video.title}
        </span>
        <span className="text-xs text-muted-foreground -mt-1">
          اضغط للمشاهدة
        </span>
      </div>

      {/* Full Screen Video Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden flex flex-col">
          <div className="relative w-full h-full flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Video Player - Full Container */}
            <div className="flex-1 flex items-center justify-center bg-black min-h-0">
              <video
                src={video.video_url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                controls
                className="w-full h-full object-contain"
              />
            </div>

            {/* Bottom Info */}
            <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
              <h3 className="text-white text-lg font-bold mb-1">{video.title}</h3>
              {video.description && (
                <p className="text-white/80 text-sm">{video.description}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
