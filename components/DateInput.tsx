
import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  label: string;
  value: any;
  path: string;
  isModified: boolean;
  isHighlighted: boolean;
  onChange: (path: string, value: any) => void;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  path,
  isModified,
  isHighlighted,
  onChange
}) => {
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Logic to sync text input (DD/MM/YYYY) with native date picker (YYYY-MM-DD)
  const getPickerValue = (val: string) => {
      if (!val || typeof val !== 'string') return '';
      // Try to parse DD/MM/YYYY or DD.MM.YYYY
      const dmy = val.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
      if (dmy) {
          // Return YYYY-MM-DD for the native date picker
          return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
      }
      return '';
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [y, m, d] = val.split('-');
      // Convert back to DD/MM/YYYY for the text input
      onChange(path, `${d}/${m}/${y}`);
  };

  const handleFieldClick = () => {
    dateInputRef.current?.click();
  };

  const isEmpty = value === null || value === undefined || value === '';
  
  let confidenceDot = "bg-emerald-400"; 
  if (isModified) confidenceDot = "bg-accent-500";
  else if (isEmpty) confidenceDot = "bg-gray-300";

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
          {/* Display Text Input (shows DD/MM/YYYY format) */}
          <input
            type="text"
            value={value || ''}
            placeholder="DD/MM/AAAA"
            autoComplete="off"
            onClick={handleFieldClick}
            className={`${baseClasses} ${stateClasses} pr-10 cursor-pointer`}
            readOnly
          />
          
          {/* Calendar Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Calendar className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>

          {/* Native Date Picker (hidden but functional) */}
          <input 
              ref={dateInputRef}
              type="date"
              value={getPickerValue(value)}
              onChange={handleDatePick}
              className="hidden"
              title="Seleccionar fecha"
          />
      </div>
    </div>
  );
};

export default DateInput;
