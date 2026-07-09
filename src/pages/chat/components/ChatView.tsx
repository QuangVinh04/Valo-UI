import { FormEvent, Fragment, ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Check, ChevronDown, Copy, Download, FileText, Image, Loader2, Paperclip, Send, Square, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useToast } from '@/context/ToastContext';
import { chatModelOptions, type ChatModelKey, type SelectedChatFile, useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/types/chat.type';
import { exportMessageDocx } from '@/services/chat.service';

function ChatView() {
  const { t } = useTranslation();
  const chat = useChat();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const isEmptyChat = !chat.messages.length && !chat.isLoading && !chat.isOpeningConversation;
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const selectedModel = chatModelOptions.find((model) => model.value === chat.modelName) ?? chatModelOptions[0];

  useEffect(() => {
    if (chat.error) {
      toast.error(chat.error);
    }
  }, [chat.error, toast]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({
      block: 'end',
      behavior: chat.isStreaming ? 'smooth' : 'auto',
    });
  }, [chat.messages, chat.isStreaming]);

  useEffect(() => {
    const textarea = promptRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 148)}px`;
    setIsComposerExpanded(
      chat.prompt.length > 64
      || chat.prompt.includes('\n')
      || textarea.scrollHeight > 40
    );
  }, [chat.prompt]);

  useEffect(() => {
    if (!isModelMenuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isModelMenuOpen]);

  // Gửi prompt khi submit form, còn logic validate/stream nằm trong useChat.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void chat.sendPrompt();
  };



  return (
    <div className="chat-page">
      <main className={`chat-main ${isEmptyChat ? 'chat-main-empty' : ''}`}>
        <section className="chat-thread">
          {chat.isOpeningConversation && (
            <div className="chat-loading-state panel-dark">
              <Loader2 size={18} aria-hidden="true" />
              {t('chat.openingConversation')}
            </div>
          )}
          {isEmptyChat && (
            <div className="empty-chat">
              <h2>{t('chat.startConversation')}</h2>
            </div>
          )}
          {chat.messages.map((message, index) => {
            const nextMessage = chat.messages[index + 1];
            const shouldShowFailedAssistant = message.senderType === 'user'
              && message.status === 'FAILED'
              && nextMessage?.senderType !== 'assistant';

            return (
              <Fragment key={message.id}>
                <ChatMessageItem
                  message={message}
                  isStreaming={chat.isStreaming && index === chat.messages.length - 1 && message.senderType === 'assistant'}
                />
                {shouldShowFailedAssistant && (
                  <ChatMessageItem
                    message={{
                      id: `${message.id}-failed-assistant`,
                      content: t('chat.messageFailed'),
                      senderType: 'assistant',
                      status: 'FAILED',
                      modelName: message.modelName,
                      createdAt: message.createdAt,
                      streamStatus: 'error',
                    }}
                    isStreaming={false}
                    isSyntheticError
                  />
                )}
              </Fragment>
            );
          })}
        </section>

        <footer className={`chat-composer-wrap ${isEmptyChat ? 'chat-composer-empty' : ''}`}>
          {chat.selectedFiles.length > 0 && (
            <div className="selected-files">
              {chat.selectedFiles.map((file, index) => (
                <SelectedFilePreview
                  selectedFile={file}
                  index={index}
                  key={file.id}
                  onRemove={chat.removeFile}
                />
              ))}
            </div>
          )}
          <form
            className={`chat-composer ${isComposerExpanded ? 'chat-composer-expanded' : ''}`}
            onSubmit={handleSubmit}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={chat.fileLimits.acceptedFileTypes}
              className="file-input"
              onChange={(event) => {
                if (event.target.files) {
                  void chat.addFiles(event.target.files);
                  event.target.value = '';
                }
              }}
              disabled={chat.isStreaming}
            />
            <IconButton
              icon={Paperclip}
              label={t('chat.attachFiles')}
              className="composer-icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={chat.isStreaming || chat.selectedFiles.length >= chat.fileLimits.maxFiles}
            />
            <textarea
              ref={promptRef}
              placeholder={t('chat.promptPlaceholder')}
              value={chat.prompt}
              onChange={(event) => chat.setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void chat.sendPrompt();
                }
              }}
              disabled={chat.isStreaming}
              rows={1}
            />
            <div className={`composer-model ${isEmptyChat ? 'composer-model-empty' : ''}`} ref={modelMenuRef}>
              <span aria-hidden="true" />
              <button
                type="button"
                className="composer-model-trigger"
                aria-expanded={isModelMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsModelMenuOpen((current) => !current)}
              >
                {selectedModel.label}
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {isModelMenuOpen && (
                <div className="model-menu" role="menu">
                  {chatModelOptions.map((model) => {
                    const isSelected = model.value === chat.modelName;

                    return (
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        className="model-menu-item"
                        key={model.value}
                        onClick={() => {
                          chat.setModelName(model.value as ChatModelKey);
                          setIsModelMenuOpen(false);
                        }}
                      >
                        <span className={`model-menu-check ${isSelected ? 'ui-checkmark' : ''}`}>
                          {isSelected && <Check size={16} aria-hidden="true" />}
                        </span>
                        <span>
                          <strong>{model.label}</strong>
                          <small>{model.value === 'flowise-agent' ? 'Trợ giúp toàn diện' : 'Câu trả lời nhanh nhất'}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {chat.isStreaming ? (
              <button type="button" className="send-btn stop-btn" onClick={chat.stopGenerating}>
                <Square size={18} aria-hidden="true" />
                <span className="sr-only">{t('chat.stopGenerating')}</span>
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={
                  (!chat.prompt.trim() && chat.selectedFiles.length === 0)
                  || chat.isWaitingForUploads
                  || chat.hasFailedUploads
                }
                title={chat.isWaitingForUploads ? t('chat.waitForUpload') : t('chat.sendPrompt')}
              >
                <Send size={20} aria-hidden="true" />
                <span className="sr-only">{t('chat.sendPrompt')}</span>
              </button>
            )}
          </form>
          <p className={`chat-disclaimer ${isEmptyChat ? 'chat-disclaimer-empty' : ''}`}>
            {t('chat.disclaimer')}
          </p>
        </footer>
        <div className="chat-scroll-anchor" ref={bottomAnchorRef} aria-hidden="true" />
      </main>
    </div>
  );
}

function ChatMessageItem({
  message,
  isStreaming,
  isSyntheticError = false,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  isSyntheticError?: boolean;
}) {
  const { t } = useTranslation();
  const [copyLabelKey, setCopyLabelKey] = useState('chat.copyResponse');

  const toast = useToast();

  const handleExportDocx = async () => {
    try {
      await exportMessageDocx(message.id);
      toast.success('Export message successfully');
    } catch {
      toast.error('Export message failed');
    }
  };

  // Sao chép nội dung phản hồi và đổi nhãn nút trong thời gian ngắn để báo trạng thái.
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyLabelKey('chat.copied');
      window.setTimeout(() => setCopyLabelKey('chat.copyResponse'), 1400);
    } catch {
      setCopyLabelKey('chat.copyFailed');
      window.setTimeout(() => setCopyLabelKey('chat.copyResponse'), 1400);
    }
  };

  if (message.senderType === 'user') {
    const status = message.status ?? 'SUCCESS';

    return (
      <>
        <div className={`user-bubble ${status === 'FAILED' ? 'user-bubble-failed' : ''}`}>
          {message.content && <p>{message.content}</p>}
          <FileUploadList fileUploads={message.fileUploads} />
        </div>
        <div className="msg-time">{formatTime(message.createdAt)}</div>
      </>
    );
  }

  const assistantClassName = [
    'assistant-msg',
    isStreaming ? 'streaming' : '',
    message.streamStatus === 'error' || message.status === 'FAILED' ? 'assistant-msg-error' : '',
  ].filter(Boolean).join(' ');
  const canExportMessage = message.senderType === 'assistant'
    && !isSyntheticError
    && !message.id.startsWith('assistant-');

  return (
    <div className={assistantClassName}>
      <div className="bot-avatar"><Bot size={20} aria-hidden="true" /></div>
      <div>
        <div className="assistant-content">
          {message.content ? (
            <>
              {renderMarkdown(message.content)}
              {isStreaming && <span className="stream-cursor" aria-hidden="true" />}
            </>
          ) : (
            <div className="thinking-indicator" aria-label={t('chat.assistantThinking')}>
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
        {!isStreaming && (
          <>
            <div className="assistant-meta">
              {(message.modelName || 'assistant').toUpperCase()} • {formatTime(message.createdAt)}
            </div>
            <div className="message-actions">
              <IconButton icon={Copy} label={t(copyLabelKey)} onClick={() => void copyMessage()} />
              {canExportMessage && (
                <IconButton
                  icon={Download}
                  label="Export DOCX"
                  onClick={() => void handleExportDocx()}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SelectedFilePreview({
  selectedFile,
  index,
  onRemove,
}: {
  selectedFile: SelectedChatFile;
  index: number;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [objectUrl, setObjectUrl] = useState('');
  const { file } = selectedFile;
  const isImage = file.type.startsWith('image/');
  const statusLabel = getSelectedFileStatusLabel(selectedFile, t);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return (
    <div className="selected-file">
      <a
        className="selected-file-preview"
        href={objectUrl}
        target="_blank"
        rel="noreferrer"
        title={t('chat.openFile', { name: file.name })}
      >
        {selectedFile.status === 'uploading' ? (
          <Loader2 size={22} aria-hidden="true" />
        ) : isImage && objectUrl ? (
          <img src={objectUrl} alt="" />
        ) : file.type.startsWith('image/') ? (
          <Image size={22} aria-hidden="true" />
        ) : (
          <FileText size={22} aria-hidden="true" />
        )}
      </a>
      <div className="selected-file-meta">
        <span title={file.name}>{file.name}</span>
        <small
          className={`selected-file-status ${selectedFile.status} ${selectedFile.uploadTarget === 'local-fallback' ? 'fallback' : ''}`}
          title={selectedFile.error}
        >
          {statusLabel}
        </small>
      </div>
      <button type="button" onClick={() => onRemove(index)} aria-label={t('chat.removeFile', { name: file.name })}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function getSelectedFileStatusLabel(
  selectedFile: SelectedChatFile,
  t: ReturnType<typeof useTranslation>['t']
) {
  if (selectedFile.status === 'error') {
    return t('chat.uploadFailed');
  }

  if (selectedFile.status === 'ready') {
    if (selectedFile.uploadTarget === 'local' || selectedFile.uploadTarget === 'local-fallback') {
      return t('chat.readyLocal');
    }

    return t('chat.ready');
  }

  if (selectedFile.uploadTarget === 'cloudinary') {
    return t('chat.uploadingCloudinary');
  }

  if (selectedFile.uploadTarget === 'local-fallback') {
    return t('chat.uploadingLocalFallback');
  }

  if (selectedFile.uploadTarget === 'local') {
    return t('chat.uploadingLocal');
  }

  return t('chat.uploading');
}

function FileUploadList({ fileUploads }: { fileUploads?: ChatMessage['fileUploads'] }) {
  if (!fileUploads?.length) return null;

  return (
    <div className="message-files">
      {fileUploads.map((fileUpload) => (
        <a
          className="message-file"
          href={fileUpload.data}
          key={`${fileUpload.data}-${fileUpload.name}`}
          rel="noreferrer"
          target="_blank"
          title={fileUpload.name}
        >
          <FileText size={16} aria-hidden="true" />
          <span>{fileUpload.name}</span>
        </a>
      ))}
    </div>
  );
}

function renderMarkdown(content: string): ReactElement[] {
  const blocks = content.split(/```/);

  return blocks.flatMap((block, index) => {
    if (index % 2 === 1) {
      const lines = block.replace(/^\w+\n/, '').trimEnd();
      return [<pre key={`code-${index}`}><code>{lines}</code></pre>];
    }

    return renderTextBlock(block, index);
  });
}

function renderTextBlock(block: string, blockIndex: number): ReactElement[] {
  const nodes: ReactElement[] = [];
  const lines = block.split('\n');
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(<p key={`p-${blockIndex}-${nodes.length}`}>{paragraph.join(' ')}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    const items = listItems.map((item, index) => <li key={index}>{item}</li>);
    nodes.push(listType === 'ol'
      ? <ol key={`ol-${blockIndex}-${nodes.length}`}>{items}</ol>
      : <ul key={`ul-${blockIndex}-${nodes.length}`}>{items}</ul>);
    listItems = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      nodes.push(level === 1
        ? <h3 key={`h-${blockIndex}-${nodes.length}`}>{text}</h3>
        : <h4 key={`h-${blockIndex}-${nodes.length}`}>{text}</h4>);
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const nextListType = numbered ? 'ol' : 'ul';
      if (listType && listType !== nextListType) {
        flushList();
      }
      listType = nextListType;
      listItems.push((bullet ?? numbered)?.[1] ?? trimmed);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return nodes;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default ChatView;
