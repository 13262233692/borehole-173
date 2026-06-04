export interface Borehole {
  id: string;
  code: string;
  name: string;
  longitude: number;
  latitude: number;
  elevation: number;
  totalDepth: number;
  drillingDate: string;
  projectId?: string;
  projectName?: string;
  driller: string;
  recorder: string;
  geologist: string;
  status: 'draft' | 'completed' | 'approved';
  createdAt: string;
  updatedAt: string;
  layers: StratumLayer[];
}

export interface StratumLayer {
  id: string;
  boreholeId: string;
  layerIndex: number;
  depthFrom: number;
  depthTo: number;
  thickness: number;
  lithologyCode: string;
  lithologyName: string;
  lithologyDesc: string;
  color: string;
  structure: string;
  weathering: string;
  remarks: string;
}

export interface LithologyDict {
  code: string;
  name: string;
  category: string;
  pattern: string;
  color: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionLine {
  id: string;
  name: string;
  startPoint: { lng: number; lat: number };
  endPoint: { lng: number; lat: number };
  boreholes: string[];
  createdAt: string;
}

export interface InterpolatedLayer {
  lithologyCode: string;
  lithologyName: string;
  depth: number;
  position: number;
  elevation: number;
}

export interface Fault {
  id: string;
  name: string;
  type: 'normal' | 'reverse' | 'strike-slip';
  startPoint: { lng: number; lat: number };
  endPoint: { lng: number; lat: number };
  dipAngle: number;
  throwAmount: number;
  heaveAmount: number;
  description: string;
  createdAt: string;
}

export interface FaultIntersection {
  faultId: string;
  faultName: string;
  faultType: 'normal' | 'reverse' | 'strike-slip';
  position: number;
  dipAngle: number;
  throwAmount: number;
  heaveAmount: number;
  topElevation: number;
  bottomElevation: number;
}

export interface SectionData {
  sectionLine: SectionLine;
  boreholes: Borehole[];
  boreholePositions: { boreholeId: string; position: number; distance: number }[];
  interpolatedLayers: { [boreholeId: string]: InterpolatedLayer[] };
  faults: FaultIntersection[];
  sectionLength: number;
  minElevation: number;
  maxElevation: number;
}

export interface SpatialQuery {
  type: 'point' | 'circle' | 'rectangle' | 'polygon';
  coordinates: number[][];
  radius?: number;
  filters: {
    minDepth?: number;
    maxDepth?: number;
    lithologyCodes?: string[];
    projectId?: string;
    dateRange?: [string, string];
  };
}

export interface BoreholeFilters {
  keyword?: string;
  projectId?: string;
  minDepth?: number;
  maxDepth?: number;
  lithologyCodes?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'png' | 'dxf';
  boreholeIds?: string[];
  sectionData?: SectionData;
  includeChart?: boolean;
}

export interface ExportResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}
