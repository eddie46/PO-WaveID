import React from 'react';

interface GradientBorderBoxProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GradientBorderBox: React.FC<GradientBorderBoxProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`gradient-border-box bg-white dark:bg-slate-800 shadow-sm transition-all ${className}`}
    >
      {children}
    </div>
  );
};
