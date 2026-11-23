import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <div className="absolute inset-0 rounded-full blur-md bg-indigo-500/20" />
      </div>
      {message && <p className="text-sm font-medium text-slate-400 mt-4">{message}</p>}
    </div>
  );
};
