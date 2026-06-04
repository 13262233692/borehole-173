import type { Borehole, StratumLayer, LithologyDict, Project, SectionLine, BoreholeFilters } from '../../shared/types';
import { store } from '../data/inMemoryStore';

export class BoreholeRepository {
  findAll(filters?: BoreholeFilters): Borehole[] {
    return store.getBoreholes(filters);
  }

  findById(id: string): Borehole | undefined {
    return store.getBoreholeById(id);
  }

  create(data: Omit<Borehole, 'id' | 'createdAt' | 'updatedAt' | 'layers'>): Borehole {
    return store.createBorehole(data);
  }

  update(id: string, data: Partial<Borehole>): Borehole | undefined {
    return store.updateBorehole(id, data);
  }

  delete(id: string): boolean {
    return store.deleteBorehole(id);
  }

  addLayer(boreholeId: string, layer: Omit<StratumLayer, 'id' | 'boreholeId'>): StratumLayer | undefined {
    return store.addLayer(boreholeId, layer);
  }

  updateLayer(boreholeId: string, layerId: string, data: Partial<StratumLayer>): StratumLayer | undefined {
    return store.updateLayer(boreholeId, layerId, data);
  }

  deleteLayer(boreholeId: string, layerId: string): boolean {
    return store.deleteLayer(boreholeId, layerId);
  }

  getLithologyDict(category?: string): LithologyDict[] {
    return store.getLithologyDict(category);
  }

  getProjects(): Project[] {
    return store.getProjects();
  }

  saveSectionLine(line: Omit<SectionLine, 'id' | 'createdAt'>): SectionLine {
    return store.saveSectionLine(line);
  }

  getSectionLines(): SectionLine[] {
    return store.getSectionLines();
  }
}

export const boreholeRepository = new BoreholeRepository();
