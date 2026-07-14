import { type RefObject } from 'react';
import { Search, X } from 'lucide-react';

type SearchInputProps = {
  value: string;
  placeholder: string;
  clearLabel: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement>;
};

function SearchInput({
  value,
  placeholder,
  clearLabel,
  onChange,
  className,
  ariaLabel,
  disabled = false,
  inputRef,
}: SearchInputProps) {
  const classes = ['search-input', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="search">
      <Search className="search-input-icon" size={18} aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {value && (
        <button
          className="search-input-clear"
          type="button"
          aria-label={clearLabel}
          disabled={disabled}
          onClick={() => {
            onChange('');
            inputRef?.current?.focus();
          }}
        >
          <X size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
