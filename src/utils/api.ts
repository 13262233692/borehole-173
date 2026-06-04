import axios from 'axios';
import type { 
  Borehole, 
  StratumLayer, 
  LithologyDict, 
  Project, 
  SectionData,
  SectionLine,
  SpatialQuery,
  PaginatedResponse,
  ExportResult,
  Fault
} from '../../shared/types';

interface Statistics {
  totalBoreholes: number;
  totalDepth: number;
  averageDepth: number;
  projects: Project[];
  lithologyDistribution: { code: string; name: string; thickness: number; color: string }[];
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const boreholeApi = {
  getBoreholes: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    projectId?: string;
    minDepth?: number;
    maxDepth?: number;
    lithologyCodes?: string[];
  }): Promise<PaginatedResponse<Borehole>> => 
    api.get('/boreholes', { params }).then(r => r.data),

  getBoreholeById: (id: string): Promise<Borehole> =>
    api.get(`/boreholes/${id}`).then(r => r.data),

  createBorehole: (data: Omit<Borehole, 'id' | 'createdAt' | 'updatedAt' | 'layers'>): Promise<Borehole> =>
    api.post('/boreholes', data).then(r => r.data),

  updateBorehole: (id: string, data: Partial<Borehole>): Promise<Borehole> =>
    api.put(`/boreholes/${id}`, data).then(r => r.data),

  deleteBorehole: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/boreholes/${id}`).then(r => r.data),

  addLayer: (boreholeId: string, layer: Omit<StratumLayer, 'id' | 'boreholeId'>): Promise<StratumLayer> =>
    api.post(`/boreholes/${boreholeId}/layers`, layer).then(r => r.data),

  updateLayer: (boreholeId: string, layerId: string, data: Partial<StratumLayer>): Promise<StratumLayer> =>
    api.put(`/boreholes/${boreholeId}/layers/${layerId}`, data).then(r => r.data),

  deleteLayer: (boreholeId: string, layerId: string): Promise<{ success: boolean }> =>
    api.delete(`/boreholes/${boreholeId}/layers/${layerId}`).then(r => r.data),
};

export const lithologyApi = {
  getDict: (category?: string): Promise<LithologyDict[]> =>
    api.get('/lithology', { params: { category } }).then(r => r.data),
};

export const projectApi = {
  getProjects: (): Promise<Project[]> =>
    api.get('/projects').then(r => r.data),
};

export const sectionApi = {
  generate: (data: {
    startPoint: { lng: number; lat: number };
    endPoint: { lng: number; lat: number };
    tolerance?: number;
  }): Promise<SectionData> =>
    api.post('/section/generate', data).then(r => r.data),

  save: (line: Omit<SectionLine, 'id' | 'createdAt'>): Promise<SectionLine> =>
    api.post('/section', line).then(r => r.data),

  getLines: (): Promise<SectionLine[]> =>
    api.get('/section').then(r => r.data),
};

export const spatialApi = {
  query: (query: SpatialQuery): Promise<Borehole[]> =>
    api.post('/spatial/query', query).then(r => r.data),

  findNearby: (lng: number, lat: number, radius: number): Promise<Borehole[]> =>
    api.get('/spatial/nearby', { params: { lng, lat, radius } }).then(r => r.data),

  getStatistics: (): Promise<Statistics> =>
    api.get('/spatial/statistics').then(r => r.data),

  getFaults: (): Promise<Fault[]> =>
    api.get('/spatial/faults').then(r => r.data),

  createFault: (data: Omit<Fault, 'id' | 'createdAt'>): Promise<Fault> =>
    api.post('/spatial/faults', data).then(r => r.data),

  deleteFault: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/spatial/faults/${id}`).then(r => r.data),
};

export const exportApi = {
  exportExcel: (boreholeIds: string[]): Promise<ExportResult> =>
    api.post('/export/excel', { boreholeIds }).then(r => r.data),

  exportDXF: (sectionData: SectionData): Promise<ExportResult> =>
    api.post('/export/dxf', { sectionData }).then(r => r.data),

  exportChart: (boreholeId: string, svgContent: string): Promise<ExportResult> =>
    api.post('/export/chart', { boreholeId, svgContent }).then(r => r.data),

  downloadUrl: (filename: string) => `/exports/${filename}`,
};

export default api;
