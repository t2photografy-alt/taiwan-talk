import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: 'primary' | 'blue' | 'soft' | 'ghost' | 'danger';
  fullWidth?: boolean;
};

const variantClass = {
  primary:
    'bg-[var(--brand-red)] text-white shadow-[0_10px_18px_rgba(239,31,36,0.22)] active:bg-red-700',
  blue: 'bg-[var(--brand-blue)] text-white shadow-[0_10px_18px_rgba(11,99,206,0.2)] active:bg-blue-800',
  soft: 'border border-[#d9e1ee] bg-white text-[var(--brand-blue)] active:bg-[#eef6ff]',
  ghost: 'bg-transparent text-[#344054] active:bg-[#f3f6fb]',
  danger: 'border border-[#ffd3d3] bg-[#fff1f0] text-[var(--brand-red)] active:bg-[#ffe5e2]',
};

export function PrimaryButton({
  children,
  icon,
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={[
        'inline-flex min-h-11 min-w-[96px] items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-55',
        variantClass[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      type={type}
      {...props}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      <span className="whitespace-nowrap leading-none">{children}</span>
    </button>
  );
}
