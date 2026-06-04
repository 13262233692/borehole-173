import { create } from 'zustand';
import type { Borehole, LithologyDict, Project, SectionData, StratumLayer } from '../../shared/types';
import { boreholeApi, lithologyApi, projectApi, spatialApi } from '../utils/api';

interface Statistics {
  totalBoreholes: number;
  totalDepth: number;
  averageDepth: number;
  projects: Project[];
  lithologyDistribution: { code: string; name: string; thickness: number; color: string }[];
}

interface BoreholeQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  projectId?: string;
  minDepth?: number;
  maxDepth?: number;
  lithologyCodes?: string[];
}

interface CreateBoreholeData {
  code: string;
  name: string;
  longitude: number;
  latitude: number;
  elevation: number;
  totalDepth: number;
  drillingDate: string;
  projectId?: string;
  driller: string;
  recorder: string;
  geologist: string;
  status: 'draft' | 'completed' | 'approved';
}

type UpdateBoreholeData = Partial<CreateBoreholeData>;

interface AppState {
  boreholes: Borehole[];
  currentBorehole: Borehole | null;
  lithologyDict: LithologyDict[];
  projects: Project[];
  statistics: Statistics | null;
  sectionData: SectionData | null;
  loading: boolean;
  error: string | null;
  
  fetchBoreholes: (params?: BoreholeQueryParams) => Promise<void>;
  fetchBoreholeById: (id: string) => Promise<Borehole | null>;
  fetchLithologyDict: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  
  createBorehole: (data: CreateBoreholeData) => Promise<Borehole | null>;
  updateBorehole: (id: string, data: UpdateBoreholeData) => Promise<Borehole | null>;
  deleteBorehole: (id: string) => Promise<boolean>;
  
  addLayer: (boreholeId: string, layer: Omit<StratumLayer, 'id' | 'boreholeId'>) => Promise<StratumLayer | null>;
  updateLayer: (boreholeId: string, layerId: string, data: Partial<StratumLayer>) => Promise<StratumLayer | null>;
  deleteLayer: (boreholeId: string, layerId: string) => Promise<boolean>;
  
  setSectionData: (data: SectionData | null) => void;
  setCurrentBorehole: (borehole: Borehole | null) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  boreholes: [],
  currentBorehole: null,
  lithologyDict: [],
  projects: [],
  statistics: null,
  sectionData: null,
  loading: false,
  error: null,

  fetchBoreholes: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await boreholeApi.getBoreholes(params);
      set({ boreholes: result.data });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ loading: false });
    }
  },

  fetchBoreholeById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const borehole = await boreholeApi.getBoreholeById(id);
      set({ currentBorehole: borehole });
      return borehole;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchLithologyDict: async () => {
    try {
      const dict = await lithologyApi.getDict();
      set({ lithologyDict: dict });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },

  fetchProjects: async () => {
    try {
      const projects = await projectApi.getProjects();
      set({ projects });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },

  fetchStatistics: async () => {
    try {
      const stats = await spatialApi.getStatistics();
      set({ statistics: stats });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },

  createBorehole: async (data) => {
    set({ loading: true, error: null });
    try {
      const borehole = await boreholeApi.createBorehole(data);
      set(state => ({ boreholes: [...state.boreholes, borehole] }));
      return borehole;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateBorehole: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const borehole = await boreholeApi.updateBorehole(id, data);
      set(state => ({
        boreholes: state.boreholes.map(b => b.id === id ? borehole : b),
        currentBorehole: state.currentBorehole?.id === id ? borehole : state.currentBorehole,
      }));
      return borehole;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteBorehole: async (id) => {
    set({ loading: true, error: null });
    try {
      await boreholeApi.deleteBorehole(id);
      set(state => ({
        boreholes: state.boreholes.filter(b => b.id !== id),
        currentBorehole: state.currentBorehole?.id === id ? null : state.currentBorehole,
      }));
      return true;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  addLayer: async (boreholeId, layer) => {
    set({ loading: true, error: null });
    try {
      const newLayer = await boreholeApi.addLayer(boreholeId, layer);
      set(state => {
        const updatedBoreholes = state.boreholes.map(b => {
          if (b.id === boreholeId) {
            return { ...b, layers: [...b.layers, newLayer].sort((a, b) => a.layerIndex - b.layerIndex) };
          }
          return b;
        });
        const currentBorehole = state.currentBorehole?.id === boreholeId
          ? { ...state.currentBorehole, layers: [...state.currentBorehole.layers, newLayer].sort((a, b) => a.layerIndex - b.layerIndex) }
          : state.currentBorehole;
        return { boreholes: updatedBoreholes, currentBorehole };
      });
      return newLayer;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateLayer: async (boreholeId, layerId, data) => {
    set({ loading: true, error: null });
    try {
      const updatedLayer = await boreholeApi.updateLayer(boreholeId, layerId, data);
      set(state => {
        const updateBoreholeLayers = (b: Borehole) => ({
          ...b,
          layers: b.layers.map(l => l.id === layerId ? updatedLayer : l),
        });
        return {
          boreholes: state.boreholes.map(b => b.id === boreholeId ? updateBoreholeLayers(b) : b),
          currentBorehole: state.currentBorehole?.id === boreholeId
            ? updateBoreholeLayers(state.currentBorehole)
            : state.currentBorehole,
        };
      });
      return updatedLayer;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteLayer: async (boreholeId, layerId) => {
    set({ loading: true, error: null });
    try {
      await boreholeApi.deleteLayer(boreholeId, layerId);
      set(state => {
        const updateBoreholeLayers = (b: Borehole) => ({
          ...b,
          layers: b.layers.filter(l => l.id !== layerId).map((l, idx) => ({ ...l, layerIndex: idx + 1 })),
        });
        return {
          boreholes: state.boreholes.map(b => b.id === boreholeId ? updateBoreholeLayers(b) : b),
          currentBorehole: state.currentBorehole?.id === boreholeId
            ? updateBoreholeLayers(state.currentBorehole)
            : state.currentBorehole,
        };
      });
      return true;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setSectionData: (data) => set({ sectionData: data }),
  setCurrentBorehole: (borehole) => set({ currentBorehole: borehole }),
  setError: (error) => set({ error }),
}));
