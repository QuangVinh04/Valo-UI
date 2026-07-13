import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

type ActionIconButtonVariant = 'neutral' | 'primary' | 'danger';

type ActionIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  label: string;
  variant?: ActionIconButtonVariant;
  size?: number;
  badge?: ReactNode;
  isLoading?: boolean;
};

function ActionIconButton({
  icon: Icon,
  label,
  variant = 'neutral',
  size = 17,
  badge,
  isLoading = false,
  className = '',
  ...props
}: ActionIconButtonProps) {
  const ButtonIcon = isLoading ? Loader2 : Icon;
  const badgeLabel = typeof badge === 'string' || typeof badge === 'number'
    ? `${label} (${badge})`
    : label;

  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`action-icon-button action-icon-button-${variant} ${className}`.trim()}
      aria-busy={isLoading || undefined}
      aria-label={badgeLabel}
      title={label}
    >
      <ButtonIcon size={size} strokeWidth={2.2} aria-hidden="true" />
      {badge !== undefined && badge !== null && (
        <span className="action-icon-badge" aria-hidden="true">{badge}</span>
      )}
    </button>
  );
}

export default ActionIconButton;
