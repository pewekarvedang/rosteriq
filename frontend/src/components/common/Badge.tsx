import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'WORKING'
  | 'WEEKLY_OFF'
  | 'LEAVE'
  | 'HOLIDAY'
  | 'COMP_OFF'
  | 'UNAVAILABLE'
  | 'DRAFT'
  | 'VALIDATED'
  | 'PUBLISHED'
  | 'CRITICAL'
  | 'WARNING'
  | 'INFO';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[11px] font-medium tracking-tight',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  }[size];

  const variantClasses: Record<BadgeVariant, { bg: string; marker: string }> = {
    default: {
      bg: 'bg-[#EDE8DC] text-[#1B1A17] border border-[#B8B1A1]',
      marker: '▪',
    },
    success: {
      bg: 'bg-[#E5EFEA] text-[#144836] border border-[#8EB8A6]',
      marker: '✓',
    },
    warning: {
      bg: 'bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B]',
      marker: '△',
    },
    danger: {
      bg: 'bg-[#FAE6E6] text-[#911D1D] border border-[#D67A7A]',
      marker: '✕',
    },
    info: {
      bg: 'bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC]',
      marker: '◆',
    },
    outline: {
      bg: 'bg-[#FBF9F5] text-[#1B1A17] border border-[#D9D4C7]',
      marker: '○',
    },

    // Roster specific statuses (color + distinct shape marker)
    WORKING: {
      bg: 'bg-[#E5EFEA] text-[#144836] border border-[#8EB8A6] font-semibold',
      marker: '✓',
    },
    WEEKLY_OFF: {
      bg: 'bg-[#EDE8DC] text-[#57534A] border border-[#D9D4C7] font-medium',
      marker: '—',
    },
    LEAVE: {
      bg: 'bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B] font-semibold',
      marker: '△',
    },
    HOLIDAY: {
      bg: 'bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC] font-semibold',
      marker: '◇',
    },
    COMP_OFF: {
      bg: 'bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC] font-semibold',
      marker: '◆',
    },
    UNAVAILABLE: {
      bg: 'bg-[#FAE6E6] text-[#911D1D] border border-[#D67A7A] font-semibold',
      marker: '✕',
    },

    // Roster workflow statuses
    DRAFT: {
      bg: 'bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B]',
      marker: '○',
    },
    VALIDATED: {
      bg: 'bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC]',
      marker: '◆',
    },
    PUBLISHED: {
      bg: 'bg-[#E5EFEA] text-[#144836] border border-[#8EB8A6]',
      marker: '✓',
    },

    // Conflict severities
    CRITICAL: {
      bg: 'bg-[#FAE6E6] text-[#911D1D] border border-[#D67A7A] font-semibold',
      marker: '✕',
    },
    WARNING: {
      bg: 'bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B]',
      marker: '△',
    },
    INFO: {
      bg: 'bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC]',
      marker: '◆',
    },
  };

  const current = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] tabular-nums ${sizeClasses} ${current.bg} ${className}`}
    >
      {dot && (
        <span aria-hidden="true" className="text-[10px] leading-none">
          {current.marker}
        </span>
      )}
      {children}
    </span>
  );
};
