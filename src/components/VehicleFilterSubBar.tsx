import React from 'react';
import { BikeType, UserBike } from '../types';
import { BIKE_FILTERS } from '../constants';
import { Check, Bike } from 'lucide-react';

interface VehicleFilterSubBarProps {
  selectedBikeType: BikeType;
  onSelectBikeType: (type: BikeType) => void;
  userBike: UserBike | null;
  onOpenGarage: () => void;
}

export const VehicleFilterSubBar: React.FC<VehicleFilterSubBarProps> = ({
  selectedBikeType,
  onSelectBikeType,
  userBike,
  onOpenGarage,
}) => {
  return (
    <div className="bg-[#161616] border-b border-neutral-800/80 py-2 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Quick Vehicle Pills */}
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider hidden lg:inline-flex items-center gap-1 mr-1">
            <Bike className="w-3.5 h-3.5 text-[#E50914]" />
            Tipe Motor:
          </span>

          {BIKE_FILTERS.map((filter) => {
            const isSelected = selectedBikeType === filter.id;
            return (
              <button
                key={filter.id}
                id={`bike-filter-${filter.id}`}
                onClick={() => onSelectBikeType(filter.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-100 text-neutral-950 font-bold shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-neutral-950 stroke-[3]" />}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Garage matching prompt */}
        <div className="flex-shrink-0 ml-auto pl-2 border-l border-neutral-800 hidden sm:block">
          {userBike ? (
            <button
              onClick={() => onSelectBikeType(userBike.type)}
              className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                selectedBikeType === userBike.type
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Fit Motor Kamu ({userBike.name.split(' ')[1] || 'Motor'})</span>
            </button>
          ) : (
            <button
              onClick={onOpenGarage}
              className="text-[11px] font-medium text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <span>+ Set Motor Garasi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
