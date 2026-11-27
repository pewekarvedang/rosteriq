import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-start p-6 text-left rounded-[4px] border border-dashed border-[#B8B1A1] bg-[#FBF9F5] ${className}`}>
      <div className="flex items-center gap-2 text-[#1B1A17]">
        <Icon className="w-4 h-4 text-[#57534A]" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-[#57534A] mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
