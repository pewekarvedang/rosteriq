import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-[4px] border border-[#D9D4C7] bg-[#FBF9F5] p-4 ${
        hoverEffect
          ? 'hover:border-[#1B1A17] hover:bg-[#F6F3EC] transition-colors cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 pb-3 mb-4 border-b border-[#D9D4C7] ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-[#1B1A17] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#57534A] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
