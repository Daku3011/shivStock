import React from 'react';

export const FINISH_METADATA: Record<string, { name: string; color: string; count: number }> = {
  ALL: { name: 'All Finishes', color: 'bg-slate-100 text-slate-800', count: 137 },
  SMT: { name: 'Super Matt', color: 'bg-blue-50 text-blue-700 border-blue-200', count: 43 },
  HG: { name: 'High Gloss', color: 'bg-purple-50 text-purple-700 border-purple-200', count: 24 },
  SF: { name: 'Suede Finish', color: 'bg-pink-50 text-pink-700 border-pink-200', count: 18 },
  MS: { name: 'Matt Silk', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', count: 8 },
  HT: { name: 'Heavy Texture', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', count: 0 },
  BO: { name: 'Bark Oak', color: 'bg-amber-50 text-amber-700 border-amber-200', count: 7 },
  FS: { name: 'Feather Silk', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', count: 7 },
  CP: { name: 'Copper / Compact', color: 'bg-teal-50 text-teal-700 border-teal-200', count: 7 },
  BR: { name: 'Brushed', color: 'bg-orange-50 text-orange-700 border-orange-200', count: 7 },
  GW: { name: 'Gloss Wave', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', count: 3 },
  STN: { name: 'Stone', color: 'bg-stone-50 text-stone-700 border-stone-200', count: 6 },
  HGS: { name: 'High Gloss Sparkle', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', count: 7 },
};

interface FinishTabsProps {
  selectedFinish: string;
  onSelectFinish: (finish: string) => void;
  stockCountsByFinish?: Record<string, number>;
  availableFinishes?: string[];
}

export const FinishTabs: React.FC<FinishTabsProps> = ({
  selectedFinish,
  onSelectFinish,
  stockCountsByFinish,
  availableFinishes,
}) => {
  const finishesToDisplay = availableFinishes && availableFinishes.length > 0
    ? availableFinishes
    : Object.keys(FINISH_METADATA);

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
      <div className="flex items-center space-x-2 min-w-max">
        {finishesToDisplay.map((key) => {
          const isSelected = selectedFinish.toUpperCase() === key.toUpperCase();
          const totalSheets = stockCountsByFinish?.[key];
          const meta = FINISH_METADATA[key];

          return (
            <button
              key={key}
              onClick={() => onSelectFinish(key)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="font-bold tracking-wide">{key}</span>
              {meta && meta.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {meta.count} SKUs
                </span>
              )}
              {totalSheets !== undefined && (
                <span className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-500'} font-normal`}>
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
