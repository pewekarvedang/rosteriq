import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading schedule data...',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 p-8 text-left border border-[#D9D4C7] rounded-[4px] bg-[#FBF9F5] ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-[#164B78] shrink-0" />
      {message && <p className="text-sm font-medium text-[#57534A]">{message}</p>}
    </div>
  );
};
