import { http } from './http';

export interface AnswerFile {
  id: string;
  uploaderId: string;
  uploaderName: string;
  uploaderType: 'student' | 'staff';
  originalName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  classId: string;
  className: string;
  batchId: string;
  status: 'uploaded' | 'reviewed';
  createdAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  classId?: string;
}

export interface ListResult {
  items: AnswerFile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadOptions {
  classId?: string;
  className?: string;
  /** 上传进度回调，percent 范围 0-100 */
  onProgress?: (percent: number) => void;
  /** AbortController signal，用于取消上传 */
  signal?: AbortSignal;
}

/**
 * 单文件上传（.doc / .docx）
 * 注意：不要手动设置 Content-Type，axios 会自动附加 FormData boundary
 */
export async function uploadAnswerFile(file: File, options: UploadOptions = {}): Promise<AnswerFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.classId) formData.append('classId', options.classId);
  if (options.className) formData.append('className', options.className);

  const response = await http.post('/exam/papers/upload', formData, {
    timeout: 0, // 上传不设超时
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total && options.onProgress) {
        options.onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data.data as AnswerFile;
}

/**
 * 压缩包批量上传（仅教职工）
 * 支持 .zip / .tar.gz / .tgz / .tar.bz2 / .rar
 */
export async function batchUploadAnswerFiles(
  file: File,
  options: UploadOptions = {},
): Promise<{ count: number; items: AnswerFile[] }> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.classId) formData.append('classId', options.classId);
  if (options.className) formData.append('className', options.className);

  const response = await http.post('/exam/papers/batch-upload', formData, {
    timeout: 0, // 压缩包解压 + 上传耗时更长
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total && options.onProgress) {
        options.onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data.data;
}

/** 获取文件列表 */
export async function fetchAnswerFiles(params: ListParams = {}): Promise<ListResult> {
  const response = await http.get('/exam/papers', { params });
  const { data } = response.data;
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 10,
  };
}

/** 删除文件 */
export async function deleteAnswerFile(id: string): Promise<void> {
  await http.delete(`/exam/papers/${id}`);
}
