import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
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
    xs: 'px-1.5 py-0.5 text-[10px] font-medium tracking-tight',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-sm font-medium',
  }[size];

  const variantClasses: Record<BadgeVariant, { bg: string; dotColor: string }> = {
    default: {
      bg: 'bg-slate-800 text-slate-300 border border-slate-700/60',
      dotColor: 'bg-slate-400',
    },
    success: {
      bg: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      bg: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
      dotColor: 'bg-amber-400',
    },
    danger: {
      bg: 'bg-rose-950/60 text-rose-300 border border-rose-800/50',
      dotColor: 'bg-rose-400',
    },
    info: {
      bg: 'bg-blue-950/60 text-blue-300 border border-blue-800/50',
      dotColor: 'bg-blue-400',
    },
    purple: {
      bg: 'bg-purple-950/60 text-purple-300 border border-purple-800/50',
      dotColor: 'bg-purple-400',
    },
    outline: {
      bg: 'bg-transparent text-slate-300 border border-slate-700',
      dotColor: 'bg-slate-400',
    },

    // Roster specific statuses
    WORKING: {
      bg: 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/60 font-semibold',
      dotColor: 'bg-indigo-400',
    },
    WEEKLY_OFF: {
      bg: 'bg-slate-800/80 text-slate-400 border border-slate-700/60 font-medium',
      dotColor: 'bg-slate-500',
    },
    LEAVE: {
      bg: 'bg-amber-950/70 text-amber-300 border border-amber-700/60 font-semibold',
      dotColor: 'bg-amber-400',
    },
    HOLIDAY: {
      bg: 'bg-teal-950/70 text-teal-300 border border-teal-700/60 font-semibold',
      dotColor: 'bg-teal-400',
    },
    COMP_OFF: {
      bg: 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 font-semibold',
      dotColor: 'bg-cyan-400',
    },
    UNAVAILABLE: {
      bg: 'bg-rose-950/70 text-rose-300 border border-rose-700/60 font-semibold',
      dotColor: 'bg-rose-400',
    },

    // Roster workflow statuses
    DRAFT: {
      bg: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
      dotColor: 'bg-amber-400',
    },
    VALIDATED: {
      bg: 'bg-blue-950/60 text-blue-300 border border-blue-800/50',
      dotColor: 'bg-blue-400',
    },
    PUBLISHED: {
      bg: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50',
      dotColor: 'bg-emerald-400',
    },

    // Conflict severities
    CRITICAL: {
      bg: 'bg-rose-950/70 text-rose-300 border border-rose-700/60 font-semibold',
      dotColor: 'bg-rose-400 animate-pulse',
    },
    WARNING: {
      bg: 'bg-amber-950/70 text-amber-300 border border-amber-700/60',
      dotColor: 'bg-amber-400',
    },
    INFO: {
      bg: 'bg-sky-950/70 text-sky-300 border border-sky-700/60',
      dotColor: 'bg-sky-400',
    },
  };

  const current = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md ${sizeClasses} ${current.bg} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />}
      {children}
    </span>
  );
};
