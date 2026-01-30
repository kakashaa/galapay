import { useState } from 'react';
import { Copy, Check, Share2, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface BankCardProps {
  name: string;
  nameArabic: string;
  accountHolder?: string;
  accountNumber?: string;
  iban?: string;
  phoneNumber?: string;
  email?: string;
  tag?: string;
  qrImage?: string;
  iconUrl?: string;
  additionalInfo?: Record<string, string>;
  color?: string;
}

export const BankCard = ({
  name,
  nameArabic,
  accountHolder,
  accountNumber,
  iban,
  phoneNumber,
  email,
  tag,
  qrImage,
  iconUrl,
  additionalInfo,
  color = 'primary',
}: BankCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`تم نسخ ${fieldName}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  const handleShare = async () => {
    const shareText = [
      nameArabic,
      accountHolder && `الاسم: ${accountHolder}`,
      accountNumber && `رقم الحساب: ${accountNumber}`,
      iban && `IBAN: ${iban}`,
      phoneNumber && `الرقم: ${phoneNumber}`,
      email && `الإيميل: ${email}`,
      tag && `التاغ: ${tag}`,
    ].filter(Boolean).join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: nameArabic,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('تم نسخ معلومات الحساب');
      }
    } catch {
      // User cancelled share
    }
  };

  const CopyableField = ({ label, value, fieldKey }: { label: string; value: string; fieldKey: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm text-foreground truncate" dir="ltr">{value}</p>
      </div>
      <button
        onClick={() => copyToClipboard(value, label)}
        className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0 mr-2"
      >
        {copiedField === label ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-${color}/10 flex items-center justify-center shrink-0 overflow-hidden`}>
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="w-10 h-10 object-contain" />
          ) : (
            <QrCode className={`w-7 h-7 text-${color}`} />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground">{nameArabic}</h3>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>

        {/* Expand Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* QR Code */}
          {qrImage && (
            <div className="bg-white rounded-xl p-4 flex justify-center">
              <img 
                src={qrImage} 
                alt={`${name} QR Code`}
                className="w-48 h-48 object-contain"
              />
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-1">
            {accountHolder && (
              <CopyableField label="اسم صاحب الحساب" value={accountHolder} fieldKey="holder" />
            )}
            {accountNumber && (
              <CopyableField label="رقم الحساب" value={accountNumber} fieldKey="account" />
            )}
            {iban && (
              <CopyableField label="رقم الآيبان (IBAN)" value={iban} fieldKey="iban" />
            )}
            {phoneNumber && (
              <CopyableField label="رقم الهاتف" value={phoneNumber} fieldKey="phone" />
            )}
            {email && (
              <CopyableField label="البريد الإلكتروني" value={email} fieldKey="email" />
            )}
            {tag && (
              <CopyableField label="التاغ / المعرف" value={tag} fieldKey="tag" />
            )}
            {additionalInfo && Object.entries(additionalInfo).map(([key, value]) => (
              <CopyableField key={key} label={key} value={value} fieldKey={key} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
