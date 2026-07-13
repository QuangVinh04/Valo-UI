import {
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from 'react';

type ModalProps = {
  as?: 'section' | 'form';
  backdropClassName?: string;
  className: string;
  labelledBy: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  isDismissDisabled?: boolean;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => (
      !element.hasAttribute('disabled')
      && element.getAttribute('aria-hidden') !== 'true'
      && getComputedStyle(element).visibility !== 'hidden'
    ));
}

function isTopmostDialog(dialog: HTMLElement): boolean {
  const openDialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
  return openDialogs[openDialogs.length - 1] === dialog;
}

function Modal({
  as = 'section',
  backdropClassName = 'modal-backdrop',
  className,
  labelledBy,
  describedBy,
  initialFocusRef,
  isDismissDisabled = false,
  onClose,
  onSubmit,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isDismissDisabledRef = useRef(isDismissDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    isDismissDisabledRef.current = isDismissDisabled;
  }, [isDismissDisabled, onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const focusableElements = getFocusableElements(dialog);
    const initialFocusTarget = initialFocusRef?.current ?? focusableElements[0] ?? dialog;
    initialFocusTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog(dialog)) return;

      if (event.key === 'Escape' && !isDismissDisabledRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusableElements(dialog);
      if (!elements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !elements.includes(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [initialFocusRef]);

  const handleBackdropClick = () => {
    if (!isDismissDisabledRef.current) {
      onCloseRef.current();
    }
  };

  const commonProps = {
    className,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelledBy,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    tabIndex: -1,
    onClick: (event: MouseEvent) => event.stopPropagation(),
  };

  return (
    <div className={backdropClassName} onClick={handleBackdropClick}>
      {as === 'form' ? (
        <form
          {...commonProps}
          ref={(node) => {
            dialogRef.current = node;
          }}
          onSubmit={onSubmit}
        >
          {children}
        </form>
      ) : (
        <section
          {...commonProps}
          ref={(node) => {
            dialogRef.current = node;
          }}
        >
          {children}
        </section>
      )}
    </div>
  );
}

export default Modal;
