import axios from 'axios';
import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import type { ApiResponse } from '@/types/api.type';
import type { FileUpload } from '@/types/chat.type';
import { handleServiceError } from './service-error.helper';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export type UploadTarget = 'cloudinary' | 'local' | 'local-fallback';

type UploadChatFileOptions = {
  onUploadTargetChange?: (target: UploadTarget) => void;
};

export async function uploadChatFile(file: File, options?: UploadChatFileOptions): Promise<{
  fileUpload: FileUpload;
}> {
  // Ưu tiên Cloudinary; nếu Cloudinary lỗi thì lưu vào data drive của server.
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    options?.onUploadTargetChange?.('cloudinary');

    try {
      return {
        fileUpload: await uploadToCloudinary(file),
      };
    } catch {
      options?.onUploadTargetChange?.('local-fallback');

      return {
        fileUpload: await uploadToServerStorage(file),
      };
    }
  }

  options?.onUploadTargetChange?.('local');

  return {
    fileUpload: await uploadToServerStorage(file),
  };
}

export async function deleteUploadedFile(fileUpload: FileUpload): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>('/attachments/upload', {
      data: { url: fileUpload.data },
    });

    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}

async function uploadToCloudinary(file: File): Promise<FileUpload> {
  // Gửi file trực tiếp lên Cloudinary và chuyển response về định dạng chat hiểu được.
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder', 'valo-chat-documents');

  const response = await axios.post<{
    secure_url?: string;
    original_filename?: string;
    format?: string;
    error?: { message?: string };
  }>(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${getCloudinaryResourceType(file)}/upload`,
    formData,
    {
      validateStatus: () => true,
    }
  );

  if (response.status < 200 || response.status >= 300 || !response.data.secure_url) {
    throw new Error(response.data.error?.message ?? `Cannot upload ${file.name}`);
  }

  return {
    data: response.data.secure_url,
    name: file.name,
    type: 'url',
    mime: file.type || inferMimeFromName(file.name),
    size: file.size,
  };
}

async function uploadToServerStorage(file: File): Promise<FileUpload> {
  try {
    const mime = file.type || inferMimeFromName(file.name);
    const response = await api.post<ApiResponse<FileUpload>>('/attachments/upload-local', {
      name: file.name,
      mime,
      size: file.size,
      dataBase64: await fileToBase64(file),
    });

    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return {
      ...response.data.data,
      mime: response.data.data.mime || mime,
      size: response.data.data.size ?? file.size,
    };
  } catch (error) {
    handleServiceError(error);
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }

  return btoa(chunks.join(''));
}

function getCloudinaryResourceType(file: File): 'image' | 'raw' {
  // Cloudinary cần resource type khác nhau giữa ảnh và tài liệu/raw file.
  return file.type.startsWith('image/') ? 'image' : 'raw';
}

function inferMimeFromName(name: string): string {
  // Dự phòng khi browser không cung cấp MIME type cho file.
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}
