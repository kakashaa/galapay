import { useState, useRef } from 'react';
import { Upload, X, Search, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface BulkIdSearchProps {
  onIdsLoaded: (ids: string[]) => void;
  matchedCount?: number;
  isActive: boolean;
  onClear: () => void;
}

const BulkIdSearch = ({ onIdsLoaded, matchedCount = 0, isActive, onClear }: BulkIdSearchProps) => {
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      toast({
        title: 'خطأ',
        description: 'يرجى رفع ملف txt فقط',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      // Parse IDs - split by newlines, commas, spaces, or tabs
      const ids = content
        .split(/[\n\r,\s\t]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0 && /^\d+$/.test(id)); // Only keep numeric IDs

      if (ids.length === 0) {
        toast({
          title: 'لم يتم العثور على IDs',
          description: 'تأكد من أن الملف يحتوي على أرقام IDs صحيحة',
          variant: 'destructive',
        });
        return;
      }

      // Remove duplicates
      const uniqueIds = [...new Set(ids)];
      
      setLoadedIds(uniqueIds);
      setFileName(file.name);
      onIdsLoaded(uniqueIds);

      toast({
        title: 'تم تحميل القائمة',
        description: `${uniqueIds.length} ID فريد من ${file.name}`,
      });
    };

    reader.onerror = () => {
      toast({
        title: 'خطأ',
        description: 'فشل في قراءة الملف',
        variant: 'destructive',
      });
    };

    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setLoadedIds([]);
    setFileName('');
    onClear();
    toast({
      title: 'تم المسح',
      description: 'تم إزالة فلتر قائمة IDs',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">بحث بقائمة IDs</span>
      </div>

      {!isActive ? (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
            id="bulk-id-file"
          />
          <label
            htmlFor="bulk-id-file"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-border/50 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">رفع ملف txt يحتوي على IDs</span>
          </label>
        </div>
      ) : (
        <div 
          className="p-3 rounded-xl border transition-all"
          style={{
            background: 'linear-gradient(145deg, hsl(142 35% 12%), hsl(142 35% 8%))',
            borderColor: 'hsla(142, 70%, 45%, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{fileName}</span>
            </div>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
              {loadedIds.length} ID محمّل
            </Badge>
            {matchedCount > 0 && (
              <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/30">
                <Search className="w-3 h-3 ml-1" />
                {matchedCount} مطابق
              </Badge>
            )}
          </div>

          {/* Show sample of loaded IDs */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {loadedIds.slice(0, 5).map((id, i) => (
              <span 
                key={i} 
                className="text-[10px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono"
              >
                {id}
              </span>
            ))}
            {loadedIds.length > 5 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
                +{loadedIds.length - 5} أخرى
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        ارفع ملف txt يحتوي على قائمة IDs (كل ID في سطر أو مفصولة بفواصل)
      </p>
    </div>
  );
};

export default BulkIdSearch;
