import { http } from './http';

export type HomeworkReviewStatus =
  | 'uploaded'
  | 'parsing'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface HomeworkClassOption {
  id: string;
  name: string;
  collegeName?: string;
  majorName?: string;
  className?: string;
}

export interface HomeworkRequirementMatch {
  requirement: string;
  status: 'matched' | 'partial' | 'missing';
  evidence: string;
}

export interface HomeworkIssue {
  severity: 'high' | 'medium' | 'low';
  category?: 'requirement' | 'logic' | 'quality' | 'document' | 'structure' | 'knowledge' | 'other';
  title: string;
  filePath: string;
  lineHint: string;
  detail: string;
  suggestion: string;
}

export interface HomeworkKnowledgePoint {
  name: string;
  status: 'mastered' | 'partial' | 'weak';
  evidence: string;
}

export interface HomeworkReviewDetail {
  passed: boolean;
  score: number;
  summary: string;
  requirementMatches: HomeworkRequirementMatch[];
  issues: HomeworkIssue[];
  knowledgePoints?: HomeworkKnowledgePoint[];
  overallSuggestions: string[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  archiveOriginalName: string;
  docOriginalName: string;
  codeSummary: string;
  reviewStatus: HomeworkReviewStatus;
  reviewScore: number;
  reviewComment: string;
  reviewDetail: string;
  submittedAt: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkMissingItem {
  homeworkId: string;
  homeworkTitle: string;
  checkDate: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
}

export interface HomeworkSeverityStats {
  high: number;
  medium: number;
  low: number;
}

export interface HomeworkCommonIssue {
  label: string;
  category: string;
  severity: string;
  count: number;
}

export interface HomeworkKnowledgeWeakness {
  name: string;
  weakCount: number;
  partialCount: number;
  masteredCount: number;
}

export interface HomeworkKeyStudent {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  problemCount: number;
  highIssueCount: number;
  weakKnowledgeCount: number;
  partialKnowledgeCount: number;
  mainProblems: string[];
  weakKnowledgePoints: string[];
}

export interface HomeworkClassReport {
  classId: string;
  collegeName: string;
  majorName: string;
  className: string;
  classPath: string;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  reviewedCount: number;
  averageScore: number;
  severityStats: HomeworkSeverityStats;
  commonIssues: HomeworkCommonIssue[];
  knowledgeWeaknesses: HomeworkKnowledgeWeakness[];
  keyStudents: HomeworkKeyStudent[];
}

export interface HomeworkReportOverview {
  classCount: number;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  reviewedCount: number;
  averageScore: number;
  severityStats: HomeworkSeverityStats;
  commonIssues: HomeworkCommonIssue[];
  knowledgeWeaknesses: HomeworkKnowledgeWeakness[];
}

export interface HomeworkReport {
  checkDate: string;
  overview: HomeworkReportOverview;
  classes: HomeworkClassReport[];
  keyStudents: HomeworkKeyStudent[];
}

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchHomeworkClasses(): Promise<HomeworkClassOption[]> {
  const res = await http.get('/homework/classes');
  return res.data.data ?? [];
}

export async function uploadHomeworkSubmission(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<HomeworkSubmission> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await http.post('/homework/submissions/upload', formData, {
    timeout: 0,
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return res.data.data as HomeworkSubmission;
}

export async function fetchMyHomeworkSubmissions(params: {
  page?: number;
  pageSize?: number;
} = {}): Promise<PageResult<HomeworkSubmission>> {
  const res = await http.get('/homework/submissions/my', { params });
  return res.data.data;
}

export async function fetchHomeworkSubmissions(params: {
  page?: number;
  pageSize?: number;
  homeworkId?: string;
  classId?: string;
  departmentId?: string;
  status?: string;
} = {}): Promise<PageResult<HomeworkSubmission>> {
  const res = await http.get('/homework/submissions', { params });
  return res.data.data;
}

export async function fetchHomeworkSubmissionDetail(id: string): Promise<HomeworkSubmission> {
  const res = await http.get(`/homework/submissions/${id}`);
  return res.data.data as HomeworkSubmission;
}

export async function fetchHomeworkMissing(params: {
  checkDate?: string;
  classId?: string;
  departmentId?: string;
} = {}): Promise<HomeworkMissingItem[]> {
  const res = await http.get('/homework/missing', { params });
  return res.data.data ?? [];
}

export async function fetchHomeworkReport(params: {
  checkDate?: string;
  classId?: string;
  departmentId?: string;
} = {}): Promise<HomeworkReport> {
  const res = await http.get('/homework/report', { params });
  return res.data.data as HomeworkReport;
}
