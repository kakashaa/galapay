import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Video, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface VideoManagementProps {
  onUpdate?: () => void;
}

const VideoManagement = ({ onUpdate }: VideoManagementProps) => {
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الفيديوهات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'خطأ',
          description: 'يرجى اختيار ملف فيديو صالح',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'خطأ',
          description: 'حجم الفيديو يجب أن يكون أقل من 100 ميجابايت',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'خطأ',
          description: 'يرجى اختيار صورة صالحة',
          variant: 'destructive',
        });
        return;
      }
      setSelectedThumbnail(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newVideo.title.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال العنوان واختيار فيديو',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload video
      const videoFileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      setUploadProgress(30);
      
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (videoError) throw videoError;
      setUploadProgress(60);

      // Get video public URL
      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName);

      let thumbnailUrl = null;

      // Upload thumbnail if provided
      if (selectedThumbnail) {
        const thumbFileName = `thumb-${Date.now()}-${selectedThumbnail.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { error: thumbError } = await supabase.storage
          .from('videos')
          .upload(thumbFileName, selectedThumbnail);

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }
      setUploadProgress(80);

      // Create database record
      const { error: dbError } = await supabase
        .from('video_tutorials')
        .insert({
          title: newVideo.title.trim(),
          description: newVideo.description.trim() || null,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          is_active: true,
          display_order: videos.length,
          created_by: user.id,
        });

      if (dbError) throw dbError;
      setUploadProgress(100);

      toast({
        title: 'تم الرفع',
        description: 'تم رفع الفيديو بنجاح',
      });

      // Reset form
      setNewVideo({ title: '', description: '' });
      setSelectedFile(null);
      setSelectedThumbnail(null);
      setPreviewUrl(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';

      fetchVideos();
      onUpdate?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع الفيديو',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('video_tutorials')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: isActive ? 'تم إخفاء الفيديو' : 'تم تفعيل الفيديو',
      });

      fetchVideos();
    } catch (error) {
      console.error('Error toggling video:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الفيديو',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (video: VideoTutorial) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;

    try {
      // Extract filename from URL
      const videoUrl = new URL(video.video_url);
      const videoPath = videoUrl.pathname.split('/').pop();
      
      // Delete from storage
      if (videoPath) {
        await supabase.storage.from('videos').remove([videoPath]);
      }

      if (video.thumbnail_url) {
        const thumbUrl = new URL(video.thumbnail_url);
        const thumbPath = thumbUrl.pathname.split('/').pop();
        if (thumbPath) {
          await supabase.storage.from('videos').remove([thumbPath]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('video_tutorials')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الفيديو بنجاح',
      });

      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الفيديو',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="dark-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">رفع فيديو جديد</h3>
        </div>

        {/* Video Preview */}
        {previewUrl && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-64">
            <video
              src={previewUrl}
              className="w-full h-full object-contain"
              controls
            />
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (videoInputRef.current) videoInputRef.current.value = '';
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-destructive/80 text-white rounded-full flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File Inputs */}
        <div className="space-y-3">
          {/* Video Input */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">الفيديو *</label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : 'اضغط لاختيار فيديو (حتى 100 ميجا)'}
              </span>
            </button>
          </div>

          {/* Thumbnail Input */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">صورة مصغرة (اختياري)</label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              className="w-full p-3 border border-border rounded-xl flex items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedThumbnail ? selectedThumbnail.name : 'اختر صورة مصغرة'}
              </span>
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">عنوان الفيديو *</label>
            <input
              type="text"
              value={newVideo.title}
              onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: كيف أرفع طلب صرف؟"
              className="input-field"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">الوصف (اختياري)</label>
            <textarea
              value={newVideo.description}
              onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
              placeholder="شرح مختصر للفيديو..."
              className="input-field resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                جاري الرفع... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !newVideo.title.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                رفع الفيديو
              </>
            )}
          </button>
        </div>
      </div>

      {/* Videos List */}
      <div className="space-y-3">
        <h3 className="font-semibold">الفيديوهات الحالية</h3>
        
        {videos.length === 0 ? (
          <div className="dark-card p-8 text-center text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد فيديوهات</p>
          </div>
        ) : (
          videos.map((video) => (
            <div key={video.id} className="dark-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{video.title}</h4>
                  {video.description && (
                    <p className="text-sm text-muted-foreground truncate">{video.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {video.is_active ? (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> مفعّل
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> مخفي
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  {video.is_active ? (
                    <Eye className="w-4 h-4 text-primary" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">مرئي للمستخدمين</span>
                  <Switch
                    checked={video.is_active}
                    onCheckedChange={() => handleToggleActive(video.id, video.is_active)}
                  />
                </div>
                <button
                  onClick={() => handleDelete(video)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideoManagement;
