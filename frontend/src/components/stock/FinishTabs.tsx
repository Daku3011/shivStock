import React from 'react';

export const FINISH_METADATA: Record<string, { name: string; color: string; count: number }> = {
  ALL: { name: 'All Finishes', color: 'bg-slate-700 text-slate-200', count: 137 },
  SMT: { name: 'Super Matt', color: 'bg-blue-600/20 text-blue-300 border-blue-500/30', count: 43 },
  HG: { name: 'High Gloss', color: 'bg-purple-600/20 text-purple-300 border-purple-500/30', count: 24 },
  SF: { name: 'Suede Finish', color: 'bg-pink-600/20 text-pink-300 border-pink-500/30', count: 18 },
  MS: { name: 'Matt Silk', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30', count: 8 },
  BO: { name: 'Bark Oak', color: 'bg-amber-600/20 text-amber-300 border-amber-500/30', count: 7 },
  FS: { name: 'Feather Silk', color: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30', count: 7 },
  CP: { name: 'Copper / Compact', color: 'bg-teal-600/20 text-teal-300 border-teal-500/30', count: 7 },
  BR: { name: 'Brushed', color: 'bg-orange-600/20 text-orange-300 border-orange-500/30', count: 7 },
  GW: { name: 'Gloss Wave', color: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30', count: 3 },
  STN: { name: 'Stone', color: 'bg-zinc-600/20 text-zinc-300 border-zinc-500/30', count: 6 },
  HGS: { name: 'High Gloss Sparkle', color: 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30', count: 7 },
};

interface FinishTabsProps {
  selectedFinish: string;
  onSelectFinish: (finish: string) => void;
  stockCountsByFinish?: Record<string, number>;
}

export const FinishTabs: React.FC<FinishTabsProps> = ({
  selectedFinish,
  onSelectFinish,
  stockCountsByFinish,
}) => {
  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
      <div className="flex items-center space-x-2 min-w-max">
        {Object.entries(FINISH_METADATA).map(([key, meta]) => {
          const isSelected = selectedFinish.toUpperCase() === key;
          const totalSheets = stockCountsByFinish?.[key];

          return (
            <button
              key={key}
              onClick={() => onSelectFinish(key)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/25 ring-2 ring-sky-500/30'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span className="font-bold tracking-wide">{key}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {meta.count} SKUs
              </span>
              {totalSheets !== undefined && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({totalSheets} sh)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
