import type { Borehole, Fault, FaultIntersection } from '../../shared/types';
import { store } from '../data/inMemoryStore';

export class SpatialRepository {
  spatialQuery(
    type: 'point' | 'circle' | 'rectangle' | 'polygon',
    coordinates: number[][],
    radius?: number
  ): Borehole[] {
    return store.spatialQuery(type, coordinates, radius);
  }

  findNearby(lng: number, lat: number, radius: number): Borehole[] {
    return store.spatialQuery('circle', [[lng, lat]], radius);
  }

  findBoreholesNearLine(
    startPoint: { lng: number; lat: number },
    endPoint: { lng: number; lat: number },
    tolerance: number = 500
  ): { borehole: Borehole; position: number; distance: number }[] {
    return store.findBoreholesNearLine(startPoint, endPoint, tolerance);
  }

  getFaults(): Fault[] {
    return store.getFaults();
  }

  getFaultById(id: string): Fault | undefined {
    return store.getFaultById(id);
  }

  createFault(data: Omit<Fault, 'id' | 'createdAt'>): Fault {
    return store.createFault(data);
  }

  deleteFault(id: string): boolean {
    return store.deleteFault(id);
  }

  findFaultIntersections(
    sectionStart: { lng: number; lat: number },
    sectionEnd: { lng: number; lat: number },
    sectionLength: number,
    minElevation: number,
    maxElevation: number
  ): FaultIntersection[] {
    return store.findFaultIntersections(
      sectionStart,
      sectionEnd,
      sectionLength,
      minElevation,
      maxElevation
    );
  }

  getStatistics() {
    const boreholes = store.getBoreholes();
    const projects = store.getProjects();
    const lithology = store.getLithologyDict();

    const totalBoreholes = boreholes.length;
    const totalDepth = boreholes.reduce((sum, bh) => sum + bh.totalDepth, 0);
    const averageDepth = totalBoreholes > 0 ? totalDepth / totalBoreholes : 0;

    const lithologyDistribution: { code: string; name: string; thickness: number; color: string }[] = [];
    const thicknessMap = new Map<string, number>();

    boreholes.forEach(bh => {
      bh.layers.forEach(layer => {
        const current = thicknessMap.get(layer.lithologyCode) || 0;
        thicknessMap.set(layer.lithologyCode, current + layer.thickness);
      });
    });

    thicknessMap.forEach((thickness, code) => {
      const dict = lithology.find(l => l.code === code);
      lithologyDistribution.push({
        code,
        name: dict?.name || code,
        thickness: Math.round(thickness * 100) / 100,
        color: dict?.color || '#808080',
      });
    });

    return {
      totalBoreholes,
      totalDepth: Math.round(totalDepth * 100) / 100,
      averageDepth: Math.round(averageDepth * 100) / 100,
      projects,
      lithologyDistribution: lithologyDistribution.sort((a, b) => b.thickness - a.thickness),
    };
  }
}

export const spatialRepository = new SpatialRepository();
