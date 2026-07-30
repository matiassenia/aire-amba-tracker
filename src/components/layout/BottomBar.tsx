// Bottom Bar - AQI Legend + Scope Toggle
import { GlassCard } from '@/components/ui/GlassCard';
import { AQI_LEGEND } from '@/lib/aqiUtils';
import type { Scope } from '@/types/airQuality';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
}

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'caba', label: 'CABA' },
  { value: 'buenos_aires', label: 'Buenos Aires' },
  { value: 'argentina', label: 'Argentina' },
];

export function BottomBar({ scope, onScopeChange }: BottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="px-4 pb-4">
        <GlassCard className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 animate-fade-in">
          {/* AQI Legend */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {AQI_LEGEND.map((item, i) => (
              <div 
                key={i}
                className="flex flex-col items-center px-2 min-w-[50px]"
              >
                <div 
                  className="w-4 h-4 rounded-full mb-1"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-white/60 text-[10px] whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Scope Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-white/10">
            {SCOPE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => onScopeChange(option.value)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  scope === option.value
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
