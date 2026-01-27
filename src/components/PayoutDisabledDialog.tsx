import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Eye, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PayoutDisabledDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextDate: string;
}

export const PayoutDisabledDialog = ({ 
  open, 
  onOpenChange,
  nextDate 
}: PayoutDisabledDialogProps) => {
  const navigate = useNavigate();

  const handlePreview = () => {
    onOpenChange(false);
    navigate('/request', { state: { previewMode: true } });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-warning/20 to-background p-6">
          {/* Warning Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>

          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              رفع الراتب متوقف حالياً
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Message */}
            <div className="glass-card p-4 text-center">
              <p className="text-foreground leading-relaxed">
                أهلاً عزيزي! 👋
              </p>
              <p className="text-foreground leading-relaxed mt-2">
                لا تقلق، رفع الراتب سيكون متاحاً في تاريخ
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{nextDate}</span>
                <span className="text-foreground">من الشهر</span>
              </div>
            </div>

            {/* Preview Notice */}
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">
                إذا أردت معرفة كيف ستكون طريقة رفع الراتب، يمكنك تصفحها الآن
              </p>
              <p className="text-xs text-destructive mt-2 font-medium">
                ⚠️ ملاحظة: هذا فقط للتصفح ولن يتم تحويل أي مبلغ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handlePreview}
                className="w-full py-3.5 rounded-xl font-bold text-base bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                تصفح طريقة رفع الراتب
              </button>
              
              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl font-bold text-base bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
