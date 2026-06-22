import type { FileUpload } from '../types';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
const maxFileContextChars = 30000;

export async function uploadChatFiles(files: File[]): Promise<{
  fileUploads: FileUpload[];
  fileContext?: string;
}> {
  if (!files.length) {
    return { fileUploads: [] };
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  const [fileUploads, contexts] = await Promise.all([
    Promise.all(files.map(uploadToCloudinary)),
    Promise.all(files.map(extractBrowserText)),
  ]);

  const fileContext = contexts
    .filter(Boolean)
    .join('\n\n---\n\n');

  return {
    fileUploads,
    fileContext: fileContext ? truncateText(fileContext, maxFileContextChars) : undefined,
  };
}

export async function uploadChatFile(file: File): Promise<{
  fileUpload: FileUpload;
  fileContext?: string;
}> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  const [fileUpload, fileContext] = await Promise.all([
    uploadToCloudinary(file),
    extractBrowserText(file),
  ]);

  return {
    fileUpload,
    fileContext: fileContext ? truncateText(fileContext, maxFileContextChars) : undefined,
  };
}

async function uploadToCloudinary(file: File): Promise<FileUpload> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder', 'valo-chat-documents');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${getCloudinaryResourceType(file)}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json().catch(() => null) as {
    secure_url?: string;
    original_filename?: string;
    format?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message ?? `Cannot upload ${file.name}`);
  }

  return {
    data: data.secure_url,
    name: file.name,
    type: 'url',
    mime: file.type || inferMimeFromName(file.name),
    size: file.size,
  };
}

function getCloudinaryResourceType(file: File): 'image' | 'raw' {
  return file.type.startsWith('image/') ? 'image' : 'raw';
}

async function extractBrowserText(file: File): Promise<string> {
  if (!isTextReadable(file)) return '';

  const text = await file.text();
  if (!text.trim()) return '';

  return [
    `File: ${file.name}`,
    `MIME: ${file.type || inferMimeFromName(file.name)}`,
    'Content:',
    truncateText(text, 12000),
  ].join('\n');
}

function isTextReadable(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type.startsWith('text/')
    || file.type === 'application/json'
    || file.type === 'application/xml'
    || file.type === 'application/csv'
    || name.endsWith('.md')
    || name.endsWith('.txt')
    || name.endsWith('.csv')
    || name.endsWith('.json');
}

function inferMimeFromName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n[Content truncated]`;
}
