import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckSquare, Square, Image } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn, AnimatedCard } from '@/components/AnimatedCard';
import StarField from '@/components/StarField';

const Confirm = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const handleContinue = () => {
    if (confirmed) {
      navigate('/request');
    }
  };

  return (
    <div className="min-h-screen premium-bg flex flex-col p-6 relative overflow-hidden">
      <StarField starCount={30} />
      {/* Header */}
      <motion.button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-muted-foreground mb-6"
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-5 h-5" />
        <span>رجوع</span>
      </motion.button>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        {/* Warning Card */}
        <FadeIn delay={0.1}>
          <AnimatedCard className="p-5 mb-5" variant="neon">
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 15px hsla(38, 92%, 55%, 0.3)', '0 0 25px hsla(38, 92%, 55%, 0.4)', '0 0 15px hsla(38, 92%, 55%, 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="w-6 h-6 text-warning" />
              </motion.div>
              <h1 className="text-xl font-bold text-foreground">
                تأكيد مهم
              </h1>
            </div>

            <div className="space-y-4 text-foreground">
              <p>
                قبل المتابعة، تأكد من أنك قمت بالتالي:
              </p>
              
              <ul className="space-y-3 mr-4">
                <motion.li 
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-primary glow-text">•</span>
                  <span>تحويل المبلغ إلى <span className="font-bold text-primary glow-text">غلا لايف - ID = 10000</span></span>
                </motion.li>
                <motion.li 
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-primary glow-text">•</span>
                  <span>تصوير إيصال التحويل بشكل واضح</span>
                </motion.li>
                <motion.li 
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-primary glow-text">•</span>
                  <span>التأكد من أن الإيصال يظهر اسم "غلا لايف" ومعرف 10000</span>
                </motion.li>
              </ul>

              <motion.div 
                className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-destructive font-medium text-sm">
                  ⚠️ لن يتم قبول أي طلب بدون إيصال تحويل صحيح لغلا لايف
                </p>
              </motion.div>
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Sample Receipt Section */}
        <FadeIn delay={0.2}>
          <AnimatedCard className="p-5 mb-5" variant="neon">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">نموذج الإيصال المطلوب</h2>
                <p className="text-xs text-muted-foreground">تأكد أن إيصالك مشابه لهذا</p>
              </div>
            </div>

            {/* Sample Receipt Image */}
            <div className="rounded-xl overflow-hidden border-2 border-primary/30 bg-primary/5">
              <div className="bg-primary/20 px-3 py-2 text-center">
                <span className="text-xs font-bold text-primary glow-text">📋 نموذج إيصال صحيح</span>
              </div>
              <img
                src="/sample-receipt.jpeg"
                alt="نموذج إيصال صحيح"
                className="w-full"
              />
              <div className="p-3 bg-primary/10 text-xs text-muted-foreground space-y-1">
                <p>✅ اسم المستخدم: <span className="font-bold text-foreground">غلا لايف</span></p>
                <p>✅ معرف المستخدم: <span className="font-bold text-primary glow-text">10000</span></p>
                <p>✅ الرقم المرجعي: <span className="font-bold text-foreground">موجود في الإيصال</span></p>
              </div>
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Confirmation Checkbox */}
        <FadeIn delay={0.3}>
          <motion.button
            onClick={() => setConfirmed(!confirmed)}
            className={`flex items-center gap-3 p-4 rounded-xl border mb-6 transition-all w-full ${
              confirmed 
                ? 'bg-primary/10 border-primary' 
                : 'neon-card'
            }`}
            style={confirmed ? { boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.3)' } : undefined}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmed ? (
              <CheckSquare className="w-6 h-6 text-primary" />
            ) : (
              <Square className="w-6 h-6 text-muted-foreground" />
            )}
            <span className={`font-medium text-right ${confirmed ? 'text-primary' : 'text-foreground'}`}>
              أؤكد أني حولت إلى غلا لايف (10000) ولدي إيصال مشابه
            </span>
          </motion.button>
        </FadeIn>

        {/* Continue Button */}
        <FadeIn delay={0.4}>
          <motion.button
            onClick={handleContinue}
            disabled={!confirmed}
            className={`w-full py-4 rounded-xl font-bold text-lg ${
              confirmed 
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground btn-glow'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            whileHover={confirmed ? { scale: 1.02 } : undefined}
            whileTap={confirmed ? { scale: 0.98 } : undefined}
          >
            متابعة لرفع الطلب
          </motion.button>
        </FadeIn>
      </div>
    </div>
  );
};

export default Confirm;
