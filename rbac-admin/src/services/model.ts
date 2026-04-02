import { http } from './http';

export const PROVIDERS = [
  { value: 'openai',    label: 'OpenAI' },
  { value: 'azure',     label: 'Azure OpenAI' },
  { value: 'deepseek',  label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'custom',    label: '自定义' },
] as const;

export type ProviderKey = (typeof PROVIDERS)[number]['value'];

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderKey;
  modelName: string;
  apiKey: string;
  apiEndpoint: string;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelInput {
  name: string;
  provider: string;
  modelName: string;
  apiKey: string;
  apiEndpoint?: string;
  description?: string;
}

export interface UpdateModelInput {
  name?: string;
  provider?: string;
  modelName?: string;
  apiKey?: string;
  apiEndpoint?: string;
  description?: string;
}

export async function fetchModels(): Promise<AIModel[]> {
  const res = await http.get('/models');
  return res.data.data ?? [];
}

export async function createModel(input: CreateModelInput): Promise<AIModel> {
  const res = await http.post('/models', input);
  return res.data.data;
}

export async function updateModel(id: string, input: UpdateModelInput): Promise<AIModel> {
  const res = await http.put(`/models/${id}`, input);
  return res.data.data;
}

export async function deleteModel(id: string): Promise<void> {
  await http.delete(`/models/${id}`);
}

export async function enableModel(id: string): Promise<void> {
  await http.put(`/models/${id}/enable`);
}

export async function disableModel(id: string): Promise<void> {
  await http.put(`/models/${id}/disable`);
}
