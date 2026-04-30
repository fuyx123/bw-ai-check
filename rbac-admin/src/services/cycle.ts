import { http } from './http';

export interface ExamSession {
  id: string;
  cycleId: string;
  type: 'daily' | 'weekly' | 'monthly';
  name: string;
  examDate: string; // YYYY-MM-DD
  unitRange: string;
  sortOrder: number;
  submitCount: number;
  createdAt: string;
}

export interface TeachingCycle {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  createdAt: string;
  sessions?: ExamSession[];
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

export interface CycleStaffOption {
  id: string;
  name: string;
  loginId: string;
  email: string;
}

/** 获取所有教学周期列表 */
export async function fetchCycles(): Promise<TeachingCycle[]> {
  const res = await http.get('/cycles');
  return res.data.data ?? [];
}

/** 创建教学周期 */
export async function createCycle(data: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<TeachingCycle> {
  const res = await http.post('/cycles', data);
  return res.data.data;
}

/** 获取周期详情（含考次列表和提交统计），classId 可选用于缩小统计范围 */
export async function fetchCycleDetail(id: string, classId?: string): Promise<TeachingCycle> {
  const params = classId ? { classId } : {};
  const res = await http.get(`/cycles/${id}`, { params });
  return res.data.data;
}

/** 删除教学周期 */
export async function deleteCycle(id: string): Promise<void> {
  await http.delete(`/cycles/${id}`);
}

/** 上传 Excel 考试安排表，解析并导入考次 */
export async function importSchedule(
  cycleId: string,
  file: File,
): Promise<{ count: number; sessions: ExamSession[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await http.post(`/cycles/${cycleId}/import`, formData);
  return res.data.data;
}

export async function fetchCycleStaff(): Promise<CycleStaffOption[]> {
  const res = await http.get('/cycles/staff');
  return res.data.data ?? [];
}

export async function fetchCycleSessionGraders(sessionId: string): Promise<ExamGrader[]> {
  const res = await http.get(`/cycles/sessions/${sessionId}/graders`);
  return res.data.data ?? [];
}

export async function upsertCycleSessionGrader(
  sessionId: string,
  payload: Pick<ExamGrader, 'classId' | 'className' | 'graderId' | 'graderName'>,
): Promise<ExamGrader> {
  const res = await http.post(`/cycles/sessions/${sessionId}/graders`, payload);
  return res.data.data;
}

export async function deleteCycleSessionGrader(id: string): Promise<void> {
  await http.delete(`/cycles/sessions/graders/${id}`);
}
