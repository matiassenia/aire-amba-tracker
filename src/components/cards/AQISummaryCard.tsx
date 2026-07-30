// AQI Summary Card - Top-left floating card showing current AQI
import { GlassCard } from '@/components/ui/GlassCard';
import { getAqiColor, getAqiLabel, getContextualMessage } from '@/lib/aqiUtils';
import { cn } from '@/lib/utils';

interface AQISummaryCardProps {
  averageAqi: number | null;
  lastUpdated: string;
  isUsingMockData: boolean;
  isLoading?: boolean;
}

export function AQISummaryCard({ 
  averageAqi, 
  lastUpdated, 
  isUsingMockData,
  isLoading 
}: AQISummaryCardProps) {
  const hasAqi = averageAqi !== null;
  const aqiColor = hasAqi ? getAqiColor(averageAqi) : "#94A3B8";
  const aqiLabel = hasAqi ? getAqiLabel(averageAqi) : "Sin datos";
  const contextual = hasAqi
    ? getContextualMessage(averageAqi)
    : { emoji: "", message: "Hay estaciones disponibles, pero todavía no hay mediciones AQI." };

  // Format last updated time
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <GlassCard className="w-64 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
          Calidad del Aire
        </span>
        {isLoading && (
          <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
        )}
      </div>

      {/* AQI Display */}
      <div className="flex items-baseline gap-3 mb-2">
        <span 
          className="text-5xl font-light tabular-nums"
          style={{ color: aqiColor }}
        >
          {hasAqi ? averageAqi : "--"}
        </span>
        <div className="flex flex-col">
          <span 
            className="text-sm font-medium"
            style={{ color: aqiColor }}
          >
            {aqiLabel}
          </span>
          <span className="text-white/40 text-xs">AQI</span>
        </div>
      </div>

      {/* Contextual Message */}
      <p className="text-white/70 text-sm leading-relaxed mb-3">
        <span className="mr-1">{contextual.emoji}</span>
        {contextual.message}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <span className="text-white/40 text-xs">
          Actualizado {formatTime(lastUpdated)}
        </span>
        {isUsingMockData && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            'bg-amber-500/20 text-amber-400'
          )}>
            Demo
          </span>
        )}
      </div>
    </GlassCard>
  );
}
