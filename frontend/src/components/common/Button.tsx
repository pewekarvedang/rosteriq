import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium gap-1.5',
    md: 'px-4 py-2 text-sm font-medium gap-2',
    lg: 'px-5 py-2.5 text-sm font-semibold gap-2',
  }[size];

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[#164B78] hover:bg-[#113A5E] text-[#FBF9F5] border border-[#164B78]',
    secondary:
      'bg-[#1B1A17] hover:bg-[#33312C] text-[#FBF9F5] border border-[#1B1A17]',
    outline:
      'bg-transparent hover:bg-[#EDE8DC] text-[#1B1A17] border border-[#B8B1A1]',
    danger:
      'bg-[#911D1D] hover:bg-[#751616] text-[#FBF9F5] border border-[#911D1D]',
    success:
      'bg-[#144836] hover:bg-[#0E3628] text-[#FBF9F5] border border-[#144836]',
    ghost:
      'bg-transparent hover:bg-[#EDE8DC] text-[#57534A] hover:text-[#1B1A17] border border-transparent',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-[4px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#164B78] focus-visible:outline-offset-2 ${sizeClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-current shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
