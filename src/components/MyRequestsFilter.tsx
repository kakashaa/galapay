import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface FilterOptions {
  country: string;
  status: string;
  minAmount: string;
  maxAmount: string;
  type: string;
}

interface MyRequestsFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  countries: string[];
  onClearFilters: () => void;
}

const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'review', label: 'قيد المراجعة' },
  { value: 'processing', label: 'قيد المعالجة' },
  { value: 'paid', label: 'تم التحويل' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'approved', label: 'تمت الموافقة' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'reserved', label: 'محجوز' },
];

const typeOptions = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'payout', label: 'راتب شهري' },
  { value: 'instant', label: 'سحب فوري' },
  { value: 'ban_report', label: 'بلاغ حظر' },
  { value: 'special_id', label: 'ايدي مميز' },
];

export const MyRequestsFilter = ({
  filters,
  onFiltersChange,
  countries,
  onClearFilters,
}: MyRequestsFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.country !== 'all' ||
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.minAmount !== '' ||
    filters.maxAmount !== '';

  const activeFiltersCount = [
    filters.country !== 'all',
    filters.status !== 'all',
    filters.type !== 'all',
    filters.minAmount !== '' || filters.maxAmount !== '',
  ].filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-3">
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            فلترة
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-3">
        <div className="glass-card p-3 space-y-3">
          {/* Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">نوع الطلب</label>
            <Select
              value={filters.type}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, type: value })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">الدولة</label>
            <Select
              value={filters.country}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, country: value })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="اختر الدولة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">جميع الدول</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country} className="text-xs">
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">الحالة</label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">نطاق المبلغ (بالدولار)</label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="من"
                value={filters.minAmount}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minAmount: e.target.value })
                }
                className="h-9 text-xs"
                dir="ltr"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                placeholder="إلى"
                value={filters.maxAmount}
                onChange={(e) =>
                  onFiltersChange({ ...filters, maxAmount: e.target.value })
                }
                className="h-9 text-xs"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
