import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  label: string;
  value: any;
  path: string;
  isModified: boolean;
  isHighlighted: boolean;
  onChange: (path: string, value: any) => void;
  compact?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  path,
  isModified,
  isHighlighted,
  onChange,
  compact = false
}) => {
  const getPickerValue = (val: string) => {
      if (!val || typeof val !== 'string') return '';
      const dmy = val.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
      if (dmy) {
          return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
      }
      return '';
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [y, m, d] = val.split('-');
      onChange(path, `${d}/${m}/${y}`);
  };

  const formatDateInput = (inputValue: string) => {
      const numbers = inputValue.replace(/\D/g, '');
      const limited = numbers.slice(0, 8);
      if (limited.length === 0) return '';
      if (limited.length <= 2) {
          return limited;
      } else if (limited.length <= 4) {
          return `${limited.slice(0, 2)}/${limited.slice(2)}`;
      } else {
          return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
      }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      onChange(path, formatted);
  };

  const isEmpty = value === null || value === undefined || value === '';
  
  let confidenceDot = "bg-emerald-400"; 
  if (isModified) confidenceDot = "bg-accent-500";
  else if (isEmpty) confidenceDot = "bg-gray-300";

  if (compact) {
    let compactInputClass = "";
    if (isModified) {
      compactInputClass = "border-accent-400 bg-accent-50 text-accent-900 ring-1 ring-accent-100";
    } else if (isHighlighted) {
      compactInputClass = "border-yellow-400 bg-white ring-1 ring-yellow-100";
    } else {
      compactInputClass = "border-slate-200 bg-white hover:border-brand-300 focus:border-brand-500";
    }

    return (
      <div className={`flex-1 relative group ${isHighlighted ? 'ring-1 ring-yellow-300 rounded' : ''}`} id={`field-${path}`}>
          <input
            type="text"
            value={value || ''}
            onChange={handleTextInputChange}
            placeholder="DD/MM/AAAA"
            autoComplete="off"
            inputMode="numeric"
            className={`w-full px-2 py-1 pr-8 text-xs border rounded transition-colors ${compactInputClass}`}
          />
          <div className="absolute right-0 top-0 h-full w-8 flex items-center justify-center z-10 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none" />
              <input 
                  type="date"
                  value={getPickerValue(value)}
                  onChange={handleDatePick}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  tabIndex={-1}
                  title="Seleccionar fecha"
              />
          </div>
          {isModified && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full" title="Editado"></span>
          )}
          {isEmpty && !isModified && (
            <span className="absolute -top-1 left-0 w-1.5 h-1.5 bg-gray-300 rounded-full" title="Dato faltante"></span>
          )}
      </div>
    );
  }

  const baseClasses = "block w-full rounded-lg text-sm px-3 py-2.5 transition-all duration-200 font-medium outline-none border shadow-sm";
  
  let stateClasses = "";
  if (isModified) {
      stateClasses = "border-accent-400 bg-accent-50 text-accent-900 ring-2 ring-accent-100 placeholder-accent-300 focus:border-accent-500 focus:ring-accent-200";
  } else if (isHighlighted) {
      stateClasses = "border-yellow-400 bg-white text-slate-800 ring-2 ring-yellow-100";
  } else {
      stateClasses = "border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 hover:bg-white hover:border-brand-300 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
  }

  return (
    <div 
      id={`field-${path}`}
      className={`mb-4 group transition-all duration-500 rounded-lg ${isHighlighted ? 'p-3 bg-yellow-50 ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : ''}`}
    >
      <div className="flex justify-between items-center mb-1">
         <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center truncate transition-colors ${isHighlighted ? 'text-yellow-700' : 'text-gray-500'}`} title={label}>
            {label}
            <span className={`ml-2 w-1.5 h-1.5 rounded-full ${confidenceDot} shadow-sm flex-shrink-0`} title={isEmpty ? "Dato faltante" : "Extraído por IA"}></span>
         </label>
         {isModified && (
           <span className="flex items-center text-[10px] font-bold text-accent-700 bg-accent-100 px-2 py-0.5 rounded-full animate-pulse">
             Editado
           </span>
         )}
      </div>
      
      <div className="relative transition-all duration-200 transform origin-left">
          <input
            type="text"
            value={value || ''}
            onChange={handleTextInputChange}
            placeholder="DD/MM/AAAA"
            autoComplete="off"
            inputMode="numeric"
            className={`${baseClasses} ${stateClasses} pr-10`}
          />
          
          <div className="absolute right-0 top-0 h-full w-10 flex items-center justify-center z-10 cursor-pointer">
              <Calendar className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors pointer-events-none" />
              <input 
                  type="date"
                  value={getPickerValue(value)}
                  onChange={handleDatePick}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  tabIndex={-1}
                  title="Seleccionar fecha"
              />
          </div>
      </div>
    </div>
  );
};

export default DateInput;
