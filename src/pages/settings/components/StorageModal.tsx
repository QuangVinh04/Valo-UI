import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Loader2, Trash2, X } from 'lucide-react';
import ActionIconButton from '@/components/common/ActionIconButton';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import SearchInput from '@/components/common/SearchInput';
import { useToast } from '@/context/ToastContext';
import { deleteAttachments, getAttachments } from '@/services/attachment.service';
import type { AttachmentItem } from '@/types/attachment.type';

type StorageModalProps = {
  onClose: () => void;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StorageModal({ onClose }: StorageModalProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteConfirmationTitleRef = useRef<HTMLHeadingElement>(null);

  const selectedCount = selectedIds.length;
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedAttachments = useMemo(
    () => attachments.filter((attachment) => selectedIdsSet.has(attachment.id)),
    [attachments, selectedIdsSet],
  );
  const hasSelectedFiles = selectedCount > 0;
  const selectedFilePreview = selectedAttachments.slice(0, 3);
  const remainingSelectedFileCount = Math.max(0, selectedCount - selectedFilePreview.length);
  const hasSearch = Boolean(submittedSearch.trim());
  const isTableEmpty = attachments.length === 0;
  const isLoadingMore = isLoading && attachments.length > 0;
  const allVisibleSelected = attachments.length > 0
    && attachments.every((attachment) => selectedIds.includes(attachment.id));

  // Tải trang tệp đầu tiên hoặc trang kế tiếp dựa trên cursor.
  const loadAttachments = async (cursor?: string | null) => {
    setIsLoading(true);

    try {
      const result = await getAttachments({
        cursor,
        limit: 20,
        search: submittedSearch,
      });
      setAttachments((current) => cursor
        ? [...current, ...result.data]
        : result.data);
      setNextCursor(result.meta?.nextCursor ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.storageLoadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAttachments();
  }, [submittedSearch]);

  useEffect(() => {
    if (!search.trim()) {
      setSelectedIds([]);
      setNextCursor(null);
      setSubmittedSearch('');
      return;
    }

    const timer = window.setTimeout(() => {
      setSelectedIds([]);
      setNextCursor(null);
      setSubmittedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Chọn hoặc bỏ chọn một tệp trong danh sách lưu trữ.
  const toggleAttachment = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ));
  };

  // Chọn toàn bộ tệp đang hiển thị hoặc bỏ chọn nhóm đó.
  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const visibleIds = new Set(attachments.map((attachment) => attachment.id));

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.has(id));
      }

      return Array.from(new Set([
        ...current,
        ...attachments.map((attachment) => attachment.id),
      ]));
    });
  };

  // Xóa các tệp đã chọn và giữ lại những id backend báo không tìm thấy.
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;

    setIsDeleting(true);

    try {
      const result = await deleteAttachments(selectedIds);
      const deletedIds = new Set(selectedIds.filter((id) => !result.notFoundIds.includes(id)));
      setAttachments((current) => current.filter((attachment) => !deletedIds.has(attachment.id)));
      setSelectedIds(result.notFoundIds);
      setIsConfirmingDelete(false);

      if (result.deletedCount > 0) {
        toast.success(t('settings.storageDeleted', { count: result.deletedCount }));
      }

      if (result.notFoundIds.length) {
        toast.warning(t('settings.storageSomeMissing'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.storageDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadSelected = () => {
    selectedAttachments.forEach((attachment) => {
      if (!attachment.url) {
        return;
      }

      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    });
  };

  return (
    <Modal
      backdropClassName="settings-modal-backdrop"
      className="settings-modal storage-modal panel-dark"
      labelledBy="storage-modal-title"
      describedBy="storage-modal-description"
      isDismissDisabled={isDeleting || isConfirmingDelete}
      onClose={onClose}
    >
        <header>
          <div>
            <h3 id="storage-modal-title">{t('settings.uploadedFiles')}</h3>
            <p className="storage-modal-description" id="storage-modal-description">{t('settings.storageManageDescription')}</p>
          </div>
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </header>

        <div className={`storage-toolbar ${hasSelectedFiles ? 'selection-actions' : ''}`}>
          {hasSelectedFiles ? (
            <>
              <span>{t('settings.selectedCount', { count: selectedCount })}</span>
              <div className="storage-selection-actions">
                <ActionIconButton
                  icon={Download}
                  label={t('settings.downloadSelected')}
                  disabled={!selectedAttachments.some((attachment) => attachment.url) || isDeleting}
                  onClick={handleDownloadSelected}
                />
                <ActionIconButton
                  icon={Trash2}
                  label={t('settings.deleteSelected')}
                  variant="danger"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(true)}
                  isLoading={isDeleting}
                />
              </div>
            </>
          ) : (
            <SearchInput
              className="storage-search-bar"
              value={search}
              placeholder={t('settings.searchFilesPlaceholder')}
              clearLabel={t('common.clearSearch')}
              onChange={setSearch}
            />
          )}
        </div>

        <div className="storage-table" role="table" aria-label={t('settings.uploadedFiles')}>
          <div className="storage-row storage-head" role="row">
            <label className="storage-check">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                disabled={!attachments.length}
                onChange={toggleAllVisible}
              />
              <span className="sr-only">{t('settings.selectAllFiles')}</span>
            </label>
            <span>{t('settings.fileName')}</span>
            <span>{t('settings.modified')}</span>
            <span>{t('settings.size')}</span>
            <span />
          </div>

          <div className="storage-table-body">
            {attachments.map((attachment) => (
              <div className="storage-row" role="row" key={attachment.id}>
                <label className="storage-check">
                  <input
                    type="checkbox"
                    checked={selectedIdsSet.has(attachment.id)}
                    onChange={() => toggleAttachment(attachment.id)}
                  />
                  <span className="sr-only">{attachment.name}</span>
                </label>
                <div className="storage-file">
                  <span className="storage-file-icon"><FileText size={16} aria-hidden="true" /></span>
                  <span title={attachment.name}>{attachment.name}</span>
                </div>
                <span>{new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(attachment.createdAt))}</span>
                <span>{formatBytes(attachment.size)}</span>
                <a
                  className="storage-download"
                  href={attachment.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('settings.downloadFile', { name: attachment.name })}
                >
                  <Download size={16} aria-hidden="true" />
                </a>
              </div>
            ))}

            {!isLoading && isTableEmpty && (
              <p className="storage-empty">
                {hasSearch ? t('settings.storageNoResults') : t('settings.storageEmpty')}
              </p>
            )}

            {isLoading && !attachments.length && (
              <p className="storage-loading"><Loader2 size={16} aria-hidden="true" /> {t('settings.loading')}</p>
            )}

            {nextCursor && (
              <button
                type="button"
                className="load-more-action storage-load-more"
                disabled={isLoading}
                onClick={() => loadAttachments(nextCursor)}
              >
                {isLoadingMore ? t('settings.loading') : t('settings.loadMore')}
              </button>
            )}
          </div>
        </div>

        <footer>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isDeleting}>
            {t('common.close')}
          </button>
        </footer>

        {isConfirmingDelete && (
          <Modal
            backdropClassName="settings-modal-backdrop storage-confirm-backdrop"
            className="settings-modal storage-delete-confirm panel-dark"
            labelledBy="storage-delete-confirm-title"
            describedBy="storage-delete-confirm-description"
            initialFocusRef={deleteConfirmationTitleRef}
            isDismissDisabled={isDeleting}
            onClose={() => setIsConfirmingDelete(false)}
          >
            <header>
              <div>
                <h3 id="storage-delete-confirm-title" ref={deleteConfirmationTitleRef} tabIndex={-1}>
                  {t('settings.confirmStorageDeleteTitle', { count: selectedCount })}
                </h3>
                <p id="storage-delete-confirm-description">
                  {t('settings.confirmStorageDeleteDescription', { count: selectedCount })}
                </p>
              </div>
              <IconButton
                icon={X}
                label={t('settings.closeStorageDeleteConfirmation')}
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              />
            </header>

            <div className="storage-delete-confirm-body">
              <ul>
                {selectedFilePreview.map((attachment) => <li key={attachment.id}>{attachment.name}</li>)}
              </ul>
              {remainingSelectedFileCount > 0 && (
                <p>{t('settings.storageDeleteMoreFiles', { count: remainingSelectedFileCount })}</p>
              )}
              <p className="storage-delete-warning">{t('settings.storageDeleteWarning')}</p>
            </div>

            <footer>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-solid-danger"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? t('settings.deletingSelected') : t('settings.confirmDeleteSelected')}
              </button>
            </footer>
          </Modal>
        )}
    </Modal>
  );
}

export default StorageModal;
