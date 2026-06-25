import type { FileUpload } from '@/types/chat.types';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export async function uploadChatFile(file: File): Promise<{
  fileUpload: FileUpload;
}> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  return {
    fileUpload: await uploadToCloudinary(file),
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

function inferMimeFromName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}
