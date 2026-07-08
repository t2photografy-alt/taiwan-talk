import darumaLogoUrl from '../assets/taiwan-talk-daruma-logo.png';

type DarumaLogoProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizeClass = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

export function DarumaLogo({ size = 'md', className = '' }: DarumaLogoProps) {
  return (
    <img
      alt="Taiwan Talk"
      className={`shrink-0 object-contain ${sizeClass[size]} ${className}`}
      draggable={false}
      src={darumaLogoUrl}
    />
  );
}
