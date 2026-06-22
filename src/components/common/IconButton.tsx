import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  label: string;
  size?: number;
};

function IconButton({ icon: Icon, label, size = 18, className = '', ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      <Icon size={size} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export default IconButton;
