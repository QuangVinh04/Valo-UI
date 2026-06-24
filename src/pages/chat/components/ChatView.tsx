import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Bot, Copy, FileText, Image, Loader2, Paperclip, Send, Square, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useToast } from '@/context/ToastContext';
import { chatModelOptions, type ChatModelKey, type SelectedChatFile, useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/types/chat.types';

function ChatView() {
  const chat = useChat();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (chat.error) {
      toast.error(chat.error);
    }
  }, [chat.error, toast]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: chat.isStreaming ? 'smooth' : 'auto',
    });
  }, [chat.messages, chat.isStreaming]);

  useEffect(() => {
    const textarea = promptRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 148)}px`;
  }, [chat.prompt]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void chat.sendPrompt();
  };

  return (
    <div className="chat-page">
      <main className="chat-main">
        <header className="chat-topbar">
          <select
            className="model-pill"
            value={chat.modelName}
            onChange={(event) => chat.setModelName(event.target.value as ChatModelKey)}
          >
            {chatModelOptions.map((model) => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </select>
        </header>

        <section className="chat-thread" ref={threadRef}>
          {chat.isOpeningConversation && (
            <div className="chat-loading-state panel-dark">
              <Loader2 size={18} aria-hidden="true" />
              Opening conversation...
            </div>
          )}
          {!chat.messages.length && !chat.isLoading && !chat.isOpeningConversation && (
            <div className="empty-chat panel-dark">
              <h2>Start a conversation</h2>
              <p>Send a prompt to create a new chat thread.</p>
            </div>
          )}
          {chat.messages.map((message, index) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isStreaming={chat.isStreaming && index === chat.messages.length - 1 && message.senderType === 'assistant'}
            />
          ))}
        </section>

        <footer className="chat-composer-wrap">
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
          <form className="chat-composer" onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="file-input"
              onChange={(event) => {
                if (event.target.files) {
                  chat.addFiles(event.target.files);
                  event.target.value = '';
                }
              }}
              disabled={chat.isStreaming}
            />
            <IconButton
              icon={Paperclip}
              label="Attach files"
              className="composer-icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={chat.isStreaming || chat.selectedFiles.length >= 5}
            />
            <textarea
              ref={promptRef}
              placeholder="Enter a prompt here..."
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
            {chat.isStreaming ? (
              <button type="button" className="send-btn stop-btn" onClick={chat.stopGenerating}>
                {chat.isUploadingFiles ? <Loader2 size={18} aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}
                <span className="sr-only">Stop generating</span>
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
                title={chat.isWaitingForUploads ? 'Please wait for the file to finish uploading' : 'Send prompt'}
              >
                <Send size={20} aria-hidden="true" />
                <span className="sr-only">Send prompt</span>
              </button>
            )}
          </form>
          <p className="chat-disclaimer">
            Neural Hub may display inaccurate info, so double-check its responses.
          </p>
        </footer>
      </main>
    </div>
  );
}

function ChatMessageItem({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [copyLabel, setCopyLabel] = useState('Copy response');

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy response'), 1400);
    } catch {
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy response'), 1400);
    }
  };

  if (message.senderType === 'user') {
    const visibleContent = getVisibleUserMessageContent(message.content);

    return (
      <>
        <div className="user-bubble">
          {visibleContent && <p>{visibleContent}</p>}
          <FileUploadList fileUploads={message.fileUploads} />
        </div>
        <div className="msg-time">{formatTime(message.createdAt)}</div>
      </>
    );
  }

  return (
    <div className={`assistant-msg ${isStreaming ? 'streaming' : ''}`}>
      <div className="bot-avatar"><Bot size={20} aria-hidden="true" /></div>
      <div>
        <div className="assistant-content">
          {message.content ? (
            <>
              {renderMarkdown(message.content)}
              {isStreaming && <span className="stream-cursor" aria-hidden="true" />}
            </>
          ) : (
            <div className="thinking-indicator" aria-label="Assistant is thinking">
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
              <IconButton icon={Copy} label={copyLabel} onClick={() => void copyMessage()} />
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
  const [objectUrl, setObjectUrl] = useState('');
  const { file } = selectedFile;
  const isImage = file.type.startsWith('image/');

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
        title={`Open ${file.name}`}
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
      <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>
        <X size={14} aria-hidden="true" />
      </button>
      <span title={file.name}>{file.name}</span>
      <small className={`selected-file-status ${selectedFile.status}`}>
        {selectedFile.status === 'uploading'
          ? 'Uploading...'
          : selectedFile.status === 'error'
            ? 'Upload failed'
            : 'Ready'}
      </small>
    </div>
  );
}

function getVisibleUserMessageContent(content: string): string {
  return content
    .split('[FILE TÀI LIỆU CỦA USER]')[0]
    .trim();
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

function renderMarkdown(content: string): ReactNode[] {
  const blocks = content.split(/```/);

  return blocks.flatMap((block, index) => {
    if (index % 2 === 1) {
      const lines = block.replace(/^\w+\n/, '').trimEnd();
      return [<pre key={`code-${index}`}><code>{lines}</code></pre>];
    }

    return renderTextBlock(block, index);
  });
}

function renderTextBlock(block: string, blockIndex: number): ReactNode[] {
  const nodes: ReactNode[] = [];
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
