import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Sparkles, Star, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StarField from '@/components/StarField';
import { toast } from 'sonner';

interface Supporter {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  thank_you_text: string;
  ai_praise_text: string | null;
}

const SupporterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supporter, setSupporter] = useState<Supporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [praiseLoading, setPraiseLoading] = useState(false);
  const [praiseText, setPraiseText] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupporter = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('supporters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching supporter:', error);
        toast.error('لم يتم العثور على الداعم');
        navigate('/');
        return;
      }

      setSupporter(data);
      
      // If already has AI praise text, use it
      if (data.ai_praise_text) {
        setPraiseText(data.ai_praise_text);
      }
      
      setLoading(false);
    };

    fetchSupporter();
  }, [id, navigate]);

  const generatePraise = async () => {
    if (!supporter) return;
    
    setPraiseLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-supporter-praise', {
        body: {
          supporterId: supporter.id,
          supporterName: supporter.name,
          supporterHandle: supporter.handle,
        },
      });

      if (error) throw error;

      if (data?.praiseText) {
        setPraiseText(data.praiseText);
        // Update local supporter state
        setSupporter(prev => prev ? { ...prev, ai_praise_text: data.praiseText } : null);
        
        if (!data.cached) {
          toast.success('تم توليد نص جديد بالذكاء الاصطناعي ✨');
        }
      }
    } catch (error) {
      console.error('Error generating praise:', error);
      toast.error('حدث خطأ أثناء توليد النص');
    } finally {
      setPraiseLoading(false);
    }
  };

  // Auto-generate praise on page load if not already exists
  useEffect(() => {
    if (supporter && !praiseText && !praiseLoading) {
      generatePraise();
    }
  }, [supporter]);

  if (loading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!supporter) {
    return null;
  }

  return (
    <div className="min-h-screen premium-bg relative overflow-hidden" dir="rtl">
      <StarField starCount={35} />
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowRight className="w-5 h-5 text-foreground" />
          </motion.button>
          <h1 className="text-lg font-bold text-foreground">تفاصيل الداعم</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 relative z-10">
        {/* Supporter Profile Card */}
        <motion.div
          className="neon-card p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Avatar */}
          <motion.div
            className="relative w-28 h-28 mx-auto mb-4"
            animate={{ 
              boxShadow: ['0 0 20px hsla(var(--primary) / 0.3)', '0 0 40px hsla(var(--primary) / 0.5)', '0 0 20px hsla(var(--primary) / 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ borderRadius: '50%' }}
          >
            {supporter.avatar_url ? (
              <img
                src={supporter.avatar_url}
                alt={supporter.name}
                className="w-full h-full rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center border-4 border-primary">
                <Heart className="w-12 h-12 text-primary-foreground" />
              </div>
            )}
            
            {/* Star Badge */}
            <motion.div
              className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-warning flex items-center justify-center shadow-lg"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-5 h-5 text-warning-foreground fill-current" />
            </motion.div>
          </motion.div>

          {/* Name & Handle */}
          <h2 className="text-2xl font-bold text-foreground mb-1">{supporter.name}</h2>
          <p className="text-primary font-medium">@{supporter.handle}</p>
          
          {/* Thank You Text */}
          <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-muted-foreground text-sm">{supporter.thank_you_text}</p>
          </div>
        </motion.div>

        {/* AI Praise Section */}
        <motion.div
          className="neon-card p-6 border-warning/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-bold text-foreground">كلمة بالذكاء الاصطناعي</h3>
            <motion.span
              className="px-2 py-0.5 text-xs font-bold bg-warning/20 text-warning rounded-full"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              AI
            </motion.span>
          </div>

          {praiseLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-warning animate-spin" />
              <p className="text-muted-foreground text-sm">جاري توليد نص فريد بالذكاء الاصطناعي...</p>
            </div>
          ) : praiseText ? (
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {praiseText}
              </p>
              
              <motion.button
                onClick={generatePraise}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm text-muted-foreground"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>توليد نص جديد</span>
              </motion.button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">اضغط لتوليد نص مدح فريد</p>
              <motion.button
                onClick={generatePraise}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-warning to-warning/80 text-warning-foreground font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className="w-5 h-5 inline-block ml-2" />
                توليد بالذكاء الاصطناعي
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Stats/Info */}
        <motion.div
          className="neon-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <Heart className="w-5 h-5 fill-current" />
            <span className="font-bold">شكراً لدعمك المستمر لتطبيق غلا لايف</span>
            <Heart className="w-5 h-5 fill-current" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SupporterDetails;
