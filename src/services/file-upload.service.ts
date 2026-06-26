import axios from 'axios';
import type { FileUpload } from '@/types/chat.type';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export async function uploadChatFile(file: File): Promise<{
  fileUpload: FileUpload;
}> {
  // Kiểm tra cấu hình trước khi cho chat upload tệp lên Cloudinary.
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  return {
    fileUpload: await uploadToCloudinary(file),
  };
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
