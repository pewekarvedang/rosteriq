import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-semibold text-[#57534A] mb-1 uppercase tracking-wider"
          >
            {label}
            {props.required && <span className="text-[#911D1D] ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#57534A] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-[4px] border bg-[#FBF9F5] px-3 py-2 text-sm text-[#1B1A17] placeholder-[#57534A]/70 transition-colors focus:outline-2 focus:outline-[#164B78] focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${
              error
                ? 'border-[#911D1D]'
                : 'border-[#D9D4C7] hover:border-[#B8B1A1]'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#911D1D] mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#57534A] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
