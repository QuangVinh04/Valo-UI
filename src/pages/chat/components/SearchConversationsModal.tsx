import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import { getConversations } from '@/services/chat.service';
import type { Conversation } from '@/types/chat.type';

type SearchConversationsModalProps = {
  onClose: () => void;
};

type DateGroup = 'today' | 'yesterday' | 'previous7Days' | 'older';

function getDateGroup(value: string): DateGroup {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'older';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const previousWeek = new Date(today);
  previousWeek.setDate(today.getDate() - 7);

  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= previousWeek) return 'previous7Days';
  return 'older';
}

function SearchConversationsModal({ onClose }: SearchConversationsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    setIsLoading(true);
    setError('');

    void getConversations({ limit: 20, search: debouncedQuery })
      .then((result) => {
        if (requestVersionRef.current !== requestVersion) return;
        setConversations(result.data);
        setNextCursor(result.meta?.nextCursor ?? null);
      })
      .catch((err: unknown) => {
        if (requestVersionRef.current !== requestVersion) return;
        setConversations([]);
        setNextCursor(null);
        setError(err instanceof Error ? err.message : t('chat.conversationsLoadFailed'));
      })
      .finally(() => {
        if (requestVersionRef.current === requestVersion) setIsLoading(false);
      });
  }, [debouncedQuery, t]);

  const groups = useMemo(() => {
    const grouped = new Map<DateGroup, Conversation[]>([
      ['today', []],
      ['yesterday', []],
      ['previous7Days', []],
      ['older', []],
    ]);
    conversations.forEach((conversation) => {
      grouped.get(getDateGroup(conversation.updatedAt || conversation.createdAt))?.push(conversation);
    });
    return Array.from(grouped).filter(([, items]) => items.length > 0);
  }, [conversations]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError('');

    try {
      const result = await getConversations({ cursor: nextCursor, limit: 20, search: debouncedQuery });
      setConversations((current) => {
        const existingIds = new Set(current.map((conversation) => conversation.id));
        return [...current, ...result.data.filter((conversation) => !existingIds.has(conversation.id))];
      });
      setNextCursor(result.meta?.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chat.conversationsLoadFailed'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openConversation = (conversationId: string) => {
    onClose();
    navigate(`/chat/${conversationId}`);
  };

  return (
    <Modal
      backdropClassName="conversation-search-backdrop"
      className="conversation-search-modal panel-dark"
      labelledBy="conversation-search-title"
      initialFocusRef={inputRef}
      onClose={onClose}
    >
      <header className="conversation-search-header">
        <h2 className="sr-only" id="conversation-search-title">{t('chat.searchConversations')}</h2>
        <div className="conversation-search-query">
          <Search size={19} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            value={query}
            placeholder={t('chat.searchConversationsPlaceholder')}
            aria-label={t('chat.searchConversations')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="conversation-search-actions">
          {query && (
            <button
              className="conversation-search-clear"
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              {t('common.clear')}
            </button>
          )}
          <span className="conversation-search-divider" aria-hidden="true" />
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </div>
      </header>

      <div className="conversation-search-results" aria-live="polite">
        {isLoading && <p className="conversation-search-state">{t('chat.loadingConversations')}</p>}
        {!isLoading && error && <p className="conversation-search-state error" role="alert">{error}</p>}
        {!isLoading && !error && conversations.length === 0 && (
          <p className="conversation-search-state">
            {debouncedQuery ? t('chat.noConversationSearchResults') : t('chat.noConversations')}
          </p>
        )}
        {!isLoading && groups.map(([group, items]) => (
          <section className="conversation-search-group" key={group}>
            <h3>{t(`chat.conversationGroups.${group}`)}</h3>
            {items.map((conversation) => (
              <button type="button" key={conversation.id} onClick={() => openConversation(conversation.id)}>
                <MessageCircle size={18} aria-hidden="true" />
                <span>{conversation.title}</span>
              </button>
            ))}
          </section>
        ))}
        {!isLoading && nextCursor && (
          <button
            type="button"
            className="conversation-search-load-more"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
          >
            {isLoadingMore ? t('chat.loadingMoreConversations') : t('chat.loadMoreConversations')}
          </button>
        )}
      </div>
    </Modal>
  );
}

export default SearchConversationsModal;
