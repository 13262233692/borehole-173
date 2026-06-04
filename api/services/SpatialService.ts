import type { Borehole, SpatialQuery } from '../../shared/types';
import { spatialRepository } from '../repositories/SpatialRepository';
import { boreholeRepository } from '../repositories/BoreholeRepository';

export class SpatialService {
  spatialQuery(query: SpatialQuery): Borehole[] {
    let results = spatialRepository.spatialQuery(
      query.type,
      query.coordinates,
      query.radius
    );

    if (query.filters) {
      const { minDepth, maxDepth, lithologyCodes, projectId, dateRange } = query.filters;
      
      if (minDepth !== undefined) {
        results = results.filter(b => b.totalDepth >= minDepth);
      }
      if (maxDepth !== undefined) {
        results = results.filter(b => b.totalDepth <= maxDepth);
      }
      if (lithologyCodes && lithologyCodes.length > 0) {
        results = results.filter(b => 
          b.layers.some(l => lithologyCodes.includes(l.lithologyCode))
        );
      }
      if (projectId) {
        results = results.filter(b => b.projectId === projectId);
      }
      if (dateRange && dateRange.length === 2) {
        const [start, end] = dateRange;
        results = results.filter(b => {
          const date = new Date(b.drillingDate);
          return date >= new Date(start) && date <= new Date(end);
        });
      }
    }

    return results;
  }

  findNearby(lng: number, lat: number, radius: number): Borehole[] {
    return spatialRepository.findNearby(lng, lat, radius);
  }

  findBoreholesNearLine(
    startPoint: { lng: number; lat: number },
    endPoint: { lng: number; lat: number },
    tolerance: number = 500
  ) {
    return spatialRepository.findBoreholesNearLine(startPoint, endPoint, tolerance);
  }

  deleteFault(id: string): boolean {
    return spatialRepository.deleteFault(id);
  }

  getStatistics() {
    const allBoreholes = boreholeRepository.findAll();
    const lithologyDict = boreholeRepository.getLithologyDict();
    
    const totalDepth = allBoreholes.reduce((sum, b) => sum + b.totalDepth, 0);
    
    const lithologyCounts: { [code: string]: number } = {};
    allBoreholes.forEach(bh => {
      bh.layers.forEach(layer => {
        lithologyCounts[layer.lithologyCode] = (lithologyCounts[layer.lithologyCode] || 0) + layer.thickness;
      });
    });

    const depthDistribution = {
      '0-20m': allBoreholes.filter(b => b.totalDepth <= 20).length,
      '20-50m': allBoreholes.filter(b => b.totalDepth > 20 && b.totalDepth <= 50).length,
      '50-100m': allBoreholes.filter(b => b.totalDepth > 50 && b.totalDepth <= 100).length,
      '>100m': allBoreholes.filter(b => b.totalDepth > 100).length,
    };

    return {
      totalBoreholes: allBoreholes.length,
      totalDepth: Number(totalDepth.toFixed(2)),
      averageDepth: allBoreholes.length > 0 ? Number((totalDepth / allBoreholes.length).toFixed(2)) : 0,
      maxDepth: allBoreholes.length > 0 ? Math.max(...allBoreholes.map(b => b.totalDepth)) : 0,
      minDepth: allBoreholes.length > 0 ? Math.min(...allBoreholes.map(b => b.totalDepth)) : 0,
      lithologyDistribution: Object.entries(lithologyCounts).map(([code, thickness]) => ({
        code,
        name: lithologyDict.find(l => l.code === code)?.name || code,
        thickness: Number(thickness.toFixed(2)),
        color: lithologyDict.find(l => l.code === code)?.color || '#808080',
      })),
      depthDistribution,
      projects: boreholeRepository.getProjects().map(p => ({
        ...p,
        boreholeCount: allBoreholes.filter(b => b.projectId === p.id).length,
      })),
    };
  }
}

export const spatialService = new SpatialService();
