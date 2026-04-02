import { http } from './http';

export interface QuestionResult {
  no: number;
  title: string;
  maxScore: number;
  correctRate: number;
  score: number;
  errorPoints: string[];
  correctApproach: string;
  answerCompletion: string;
}

export interface GradingDetail {
  questions: QuestionResult[];
  totalScore: number;
  summary: string;
}

export interface ExamGrader {
  id: string;
  examSessionId: string;
  classId: string;
  className: string;
  graderId: string;
  graderName: string;
  createdAt: string;
}

export interface AnswerFile {
  id: string;
  examSessionId: string;
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
  status: 'uploaded' | 'grading' | 'graded' | 'reviewed' | 'failed';
  aiComment: string;
  aiScore: number;
  aiDetail: string; // JSON 字符串
  manualScore: number | null;
  manualComment: string;
  graderId: string;
  gradedAt: string | null;
  createdAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  classId?: string;
  examSessionId?: string;
  cycleId?: string;
}

export interface ListResult {
  items: AnswerFile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadOptions {
  examSessionId?: string;
  classId?: string;
  className?: string;
  /** 上传进度回调，percent 范围 0-100 */
  onProgress?: (percent: number) => void;
  /** AbortController signal，用于取消上传 */
  signal?: AbortSignal;
}

/** 单文件上传（.doc / .docx） */
export async function uploadAnswerFile(file: File, options: UploadOptions = {}): Promise<AnswerFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.examSessionId) formData.append('examSessionId', options.examSessionId);
  if (options.classId) formData.append('classId', options.classId);
  if (options.className) formData.append('className', options.className);

  const response = await http.post('/exam/papers/upload', formData, {
    timeout: 0,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total && options.onProgress) {
        options.onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data.data as AnswerFile;
}

/** 压缩包批量上传 */
export async function batchUploadAnswerFiles(
  file: File,
  options: UploadOptions = {},
): Promise<{ count: number; items: AnswerFile[] }> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.examSessionId) formData.append('examSessionId', options.examSessionId);
  if (options.classId) formData.append('classId', options.classId);
  if (options.className) formData.append('className', options.className);

  const response = await http.post('/exam/papers/batch-upload', formData, {
    timeout: 0,
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

/** 获取阅卷明细（含 AI 结构化评分） */
export async function fetchGradingDetail(id: string): Promise<AnswerFile> {
  const res = await http.get(`/exam/papers/${id}/grading`);
  return res.data.data as AnswerFile;
}

export interface ManualReviewInput {
  manualScore: number;
  manualComment: string;
}

/** 提交人工复阅结果 */
export async function submitManualReview(id: string, input: ManualReviewInput): Promise<void> {
  await http.post(`/exam/papers/${id}/review`, input);
}

export interface ClassOption {
  id: string;
  name: string;
}

/** 获取当前用户可访问的班级列表 */
export async function fetchAccessibleClasses(): Promise<ClassOption[]> {
  const res = await http.get('/exam/classes');
  return res.data.data ?? [];
}

/** 获取考次的阅卷老师列表 */
export async function fetchSessionGraders(sessionId: string): Promise<ExamGrader[]> {
  const res = await http.get(`/exam/sessions/${sessionId}/graders`);
  return res.data.data ?? [];
}

export interface UpsertGraderInput {
  classId: string;
  className: string;
  graderId: string;
  graderName: string;
}

/** 设置考次某班级的阅卷老师 */
export async function upsertSessionGrader(sessionId: string, input: UpsertGraderInput): Promise<ExamGrader> {
  const res = await http.post(`/exam/sessions/${sessionId}/graders`, input);
  return res.data.data as ExamGrader;
}

/** 删除阅卷老师分配 */
export async function deleteSessionGrader(id: string): Promise<void> {
  await http.delete(`/exam/sessions/graders/${id}`);
}
