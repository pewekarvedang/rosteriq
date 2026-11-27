import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[11px] font-semibold text-[#57534A] mb-1 uppercase tracking-wider"
          >
            {label}
            {props.required && <span className="text-[#911D1D] ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full rounded-[4px] border bg-[#FBF9F5] px-3 py-2 text-sm text-[#1B1A17] transition-colors focus:outline-2 focus:outline-[#164B78] focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-[#911D1D]'
              : 'border-[#D9D4C7] hover:border-[#B8B1A1]'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#FBF9F5] text-[#57534A]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#FBF9F5] text-[#1B1A17]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[#911D1D] mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#57534A] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
