import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  icon?: ReactNode;
};

export function Chip({ children, selected = false, icon, className = '', type = 'button', ...props }: ChipProps) {
  return (
    <button
      className={[
        'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
        selected
          ? 'border-[var(--brand-red)] bg-[var(--brand-red)] text-white shadow-[0_8px_16px_rgba(239,31,36,0.18)]'
          : 'border-[#d9e1ee] bg-white text-[#344054] active:bg-[#f3f6fb]',
        className,
      ].join(' ')}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
