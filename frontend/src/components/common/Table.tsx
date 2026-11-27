import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-[4px] border border-[#D9D4C7] bg-[#FBF9F5]">
      <table className={`w-full text-left text-xs text-[#1B1A17] border-collapse tabular-nums ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <thead
      className={`border-b border-[#B8B1A1] bg-[#EDE8DC] text-[11px] uppercase font-semibold text-[#57534A] tracking-wider ${className}`}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-[#D9D4C7] ${className}`}>{children}</tbody>;
};

export const TableRow: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-[#EDE8DC]/60 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <th className={`px-4 py-2.5 ${className}`}>{children}</th>;
};

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <td className={`px-4 py-2.5 align-middle ${className}`}>{children}</td>;
};
