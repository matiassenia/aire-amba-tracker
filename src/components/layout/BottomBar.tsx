import type { Region, Scope } from '@/types/airQuality';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  regions: Region[];
}

export function BottomBar({ scope, onScopeChange, regions }: BottomBarProps) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <nav
          aria-label="Seleccionar región"
          className="pointer-events-auto mx-auto flex max-w-[min(96vw,62rem)] items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-950/52 p-1 shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-2xl animate-fade-in"
        >
            {regions.map(region => (
              <button
                key={region.id}
                onClick={() => onScopeChange(region.id)}
                aria-pressed={scope === region.id}
                className={cn(
                  'min-h-10 whitespace-nowrap px-4 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-200/70',
                  scope === region.id
                    ? 'bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]'
                    : 'text-white/58 hover:bg-white/10 hover:text-white'
                )}
              >
                {region.name}
              </button>
            ))}
        </nav>
      </div>
    </div>
  );
}
