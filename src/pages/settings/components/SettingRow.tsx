import type { LucideIcon } from 'lucide-react';

type SettingRowProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel?: string;
  buttonClassName?: string;
  danger?: boolean;
  onClick?: () => void;
};

function SettingRow({
  icon,
  title,
  description,
  buttonLabel,
  buttonClassName,
  danger = false,
  onClick,
}: SettingRowProps) {
  const Icon = icon;

  return (
    <div className="setting-row panel-dark">
      <div className={`setting-icon ${danger ? 'danger' : ''}`}>
        <Icon size={22} strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {buttonLabel && onClick ? (
        <button type="button" className={buttonClassName} onClick={onClick}>
          {buttonLabel}
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export default SettingRow;
