import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Solid scrim without blur */}
      <div className="fixed inset-0 bg-[#1B1A17]/50" onClick={onClose} />

      {/* Ruled sheet dialog */}
      <div
        className={`relative w-full ${maxWidthClasses} rounded-[6px] border border-[#1B1A17] bg-[#FBF9F5] z-10 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between border-b border-[#D9D4C7] bg-[#EDE8DC] px-6 py-4 rounded-t-[4px]">
          <div>
            <h3 className="text-base font-semibold text-[#1B1A17]">{title}</h3>
            {subtitle && <p className="text-xs text-[#57534A] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-[4px] text-[#57534A] hover:text-[#1B1A17] hover:bg-[#D9D4C7]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[#D9D4C7] px-6 py-4 bg-[#F6F3EC] rounded-b-[4px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
