import axios from 'axios';
import type {
  UploadResponse,
  AnalysisResult,
  CounterfactualParams,
  CounterfactualResult,
  CoachResult,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000, // 2 min for large datasets + LLM calls
});

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<UploadResponse>('/upload', form);
  return data;
}

export async function runAnalysis(sessionId: string): Promise<AnalysisResult> {
  const { data } = await api.post<AnalysisResult>(`/analysis/${sessionId}`);
  return data;
}

export async function getAnalysis(sessionId: string): Promise<AnalysisResult> {
  const { data } = await api.get<AnalysisResult>(`/analysis/${sessionId}`);
  return data;
}

export async function runCounterfactual(
  sessionId: string,
  params: CounterfactualParams
): Promise<CounterfactualResult> {
  const { data } = await api.post<CounterfactualResult>(
    `/counterfactual/${sessionId}`,
    params
  );
  return data;
}

export async function getCoaching(
  sessionId: string,
  provider?: string
): Promise<CoachResult> {
  const { data } = await api.post<CoachResult>(`/coach/${sessionId}`, {
    provider: provider || null,
  });
  return data;
}

export async function listSessions(): Promise<
  { id: string; filename: string; trade_count: number; status: string; created_at: string }[]
> {
  const { data } = await api.get('/sessions');
  return data;
}
