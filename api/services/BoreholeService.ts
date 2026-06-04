import type { Borehole, StratumLayer, LithologyDict, Project, SectionLine, SectionData, InterpolatedLayer, BoreholeFilters } from '../../shared/types';
import { boreholeRepository } from '../repositories/BoreholeRepository';
import { spatialRepository } from '../repositories/SpatialRepository';

export class BoreholeService {
  getBoreholes(page?: number, pageSize?: number, filters?: BoreholeFilters) {
    const all = boreholeRepository.findAll(filters);
    
    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        data: all.slice(start, end),
        total: all.length,
        page,
        pageSize,
      };
    }
    
    return {
      data: all,
      total: all.length,
      page: 1,
      pageSize: all.length,
    };
  }

  getBoreholeById(id: string): Borehole | undefined {
    return boreholeRepository.findById(id);
  }

  createBorehole(data: Omit<Borehole, 'id' | 'createdAt' | 'updatedAt' | 'layers'>): Borehole {
    return boreholeRepository.create(data);
  }

  updateBorehole(id: string, data: Partial<Borehole>): Borehole | undefined {
    return boreholeRepository.update(id, data);
  }

  deleteBorehole(id: string): boolean {
    return boreholeRepository.delete(id);
  }

  addLayer(boreholeId: string, layer: Omit<StratumLayer, 'id' | 'boreholeId'>): StratumLayer | undefined {
    return boreholeRepository.addLayer(boreholeId, layer);
  }

  updateLayer(boreholeId: string, layerId: string, data: Partial<StratumLayer>): StratumLayer | undefined {
    return boreholeRepository.updateLayer(boreholeId, layerId, data);
  }

  deleteLayer(boreholeId: string, layerId: string): boolean {
    return boreholeRepository.deleteLayer(boreholeId, layerId);
  }

  getLithologyDict(category?: string): LithologyDict[] {
    return boreholeRepository.getLithologyDict(category);
  }

  getProjects(): Project[] {
    return boreholeRepository.getProjects();
  }

  getFaults() {
    return spatialRepository.getFaults();
  }

  generateSectionData(
    startPoint: { lng: number; lat: number },
    endPoint: { lng: number; lat: number },
    tolerance: number = 500
  ): SectionData | null {
    const boreholePositions = spatialRepository.findBoreholesNearLine(startPoint, endPoint, tolerance);
    
    if (boreholePositions.length === 0) {
      return null;
    }

    const boreholes = boreholePositions.map(bp => bp.borehole);
    const sectionLength = this.calculateDistance(startPoint, endPoint);
    
    let minElevation = Infinity;
    let maxElevation = -Infinity;
    
    boreholes.forEach(bh => {
      minElevation = Math.min(minElevation, bh.elevation - bh.totalDepth);
      maxElevation = Math.max(maxElevation, bh.elevation);
    });

    const faultIntersections = spatialRepository.findFaultIntersections(
      startPoint,
      endPoint,
      sectionLength,
      Math.floor(minElevation - 5),
      Math.ceil(maxElevation + 5)
    );
    
    const interpolatedLayers: { [boreholeId: string]: InterpolatedLayer[] } = {};
    
    boreholes.forEach(bh => {
      interpolatedLayers[bh.id] = bh.layers.map(layer => ({
        lithologyCode: layer.lithologyCode,
        lithologyName: layer.lithologyName,
        depth: layer.depthTo,
        position: boreholePositions.find(bp => bp.borehole.id === bh.id)!.position,
        elevation: bh.elevation - layer.depthTo,
      }));
    });

    const sectionLine: SectionLine = {
      id: '',
      name: `剖面_${new Date().toLocaleDateString()}`,
      startPoint,
      endPoint,
      boreholes: boreholes.map(b => b.id),
      createdAt: new Date().toISOString(),
    };

    const formattedPositions = boreholePositions.map(bp => ({
      boreholeId: bp.borehole.id,
      position: bp.position,
      distance: bp.distance,
    }));

    return {
      sectionLine,
      boreholes,
      boreholePositions: formattedPositions,
      interpolatedLayers,
      faults: faultIntersections,
      sectionLength,
      minElevation: Math.floor(minElevation - 5),
      maxElevation: Math.ceil(maxElevation + 5),
    };
  }

  private calculateDistance(p1: { lng: number; lat: number }, p2: { lng: number; lat: number }): number {
    const R = 6371000;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  saveSectionLine(line: Omit<SectionLine, 'id' | 'createdAt'>): SectionLine {
    return boreholeRepository.saveSectionLine(line);
  }

  getSectionLines(): SectionLine[] {
    return boreholeRepository.getSectionLines();
  }
}

export const boreholeService = new BoreholeService();
