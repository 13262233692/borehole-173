import { v4 as uuidv4 } from 'uuid';
import type { Borehole, LithologyDict, Project, StratumLayer, SectionLine, Fault, FaultIntersection, BoreholeFilters } from '../../shared/types';
import { lithologyDict, projects, sampleBoreholes, sampleFaults } from './mockData';

class InMemoryStore {
  private boreholes: Map<string, Borehole>;
  private lithology: LithologyDict[];
  private projects: Project[];
  private sectionLines: Map<string, SectionLine>;
  private faults: Map<string, Fault>;

  constructor() {
    this.boreholes = new Map();
    this.lithology = [...lithologyDict];
    this.projects = [...projects];
    this.sectionLines = new Map();
    this.faults = new Map();
    
    sampleBoreholes.forEach(bh => {
      this.boreholes.set(bh.id, bh);
    });

    sampleFaults.forEach(f => {
      this.faults.set(f.id, f);
    });
  }

  getBoreholes(filters?: BoreholeFilters): Borehole[] {
    let result = Array.from(this.boreholes.values());
    
    if (filters) {
      if (filters.projectId) {
        result = result.filter(b => b.projectId === filters.projectId);
      }
      if (filters.minDepth) {
        result = result.filter(b => b.totalDepth >= filters.minDepth);
      }
      if (filters.maxDepth) {
        result = result.filter(b => b.totalDepth <= filters.maxDepth);
      }
      if (filters.lithologyCodes?.length > 0) {
        result = result.filter(b => 
          b.layers.some(l => filters.lithologyCodes.includes(l.lithologyCode))
        );
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        result = result.filter(b => 
          b.code.toLowerCase().includes(kw) ||
          b.name.toLowerCase().includes(kw)
        );
      }
    }
    
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }

  getBoreholeById(id: string): Borehole | undefined {
    return this.boreholes.get(id);
  }

  createBorehole(data: Omit<Borehole, 'id' | 'createdAt' | 'updatedAt' | 'layers'>): Borehole {
    const now = new Date().toISOString();
    const borehole: Borehole = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      layers: [],
    };
    this.boreholes.set(borehole.id, borehole);
    return borehole;
  }

  updateBorehole(id: string, data: Partial<Borehole>): Borehole | undefined {
    const existing = this.boreholes.get(id);
    if (!existing) return undefined;
    
    const updated: Borehole = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.boreholes.set(id, updated);
    return updated;
  }

  deleteBorehole(id: string): boolean {
    return this.boreholes.delete(id);
  }

  addLayer(boreholeId: string, layer: Omit<StratumLayer, 'id' | 'boreholeId'>): StratumLayer | undefined {
    const borehole = this.boreholes.get(boreholeId);
    if (!borehole) return undefined;

    const newLayer: StratumLayer = {
      ...layer,
      id: uuidv4(),
      boreholeId,
    };
    
    borehole.layers.push(newLayer);
    borehole.layers.sort((a, b) => a.layerIndex - b.layerIndex);
    borehole.totalDepth = Math.max(borehole.totalDepth, layer.depthTo);
    borehole.updatedAt = new Date().toISOString();
    
    return newLayer;
  }

  updateLayer(boreholeId: string, layerId: string, data: Partial<StratumLayer>): StratumLayer | undefined {
    const borehole = this.boreholes.get(boreholeId);
    if (!borehole) return undefined;

    const layerIndex = borehole.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return undefined;

    borehole.layers[layerIndex] = {
      ...borehole.layers[layerIndex],
      ...data,
      id: layerId,
      boreholeId,
    };
    
    borehole.totalDepth = Math.max(...borehole.layers.map(l => l.depthTo));
    borehole.updatedAt = new Date().toISOString();
    
    return borehole.layers[layerIndex];
  }

  deleteLayer(boreholeId: string, layerId: string): boolean {
    const borehole = this.boreholes.get(boreholeId);
    if (!borehole) return false;

    const initialLength = borehole.layers.length;
    borehole.layers = borehole.layers.filter(l => l.id !== layerId);
    
    if (borehole.layers.length < initialLength) {
      borehole.layers.forEach((l, idx) => {
        l.layerIndex = idx + 1;
      });
      borehole.totalDepth = borehole.layers.length > 0 
        ? Math.max(...borehole.layers.map(l => l.depthTo)) 
        : 0;
      borehole.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getLithologyDict(category?: string): LithologyDict[] {
    if (category) {
      return this.lithology.filter(l => l.category === category);
    }
    return this.lithology;
  }

  getProjects(): Project[] {
    return this.projects;
  }

  spatialQuery(
    type: 'point' | 'circle' | 'rectangle' | 'polygon',
    coordinates: number[][],
    radius?: number
  ): Borehole[] {
    const allBoreholes = Array.from(this.boreholes.values());
    
    if (type === 'circle' && radius && coordinates.length === 1) {
      const [centerLng, centerLat] = coordinates[0];
      
      return allBoreholes.filter(bh => {
        const dx = (bh.longitude - centerLng) * Math.cos(centerLat * Math.PI / 180);
        const dy = bh.latitude - centerLat;
        const distance = Math.sqrt(dx * dx + dy * dy) * 111000;
        return distance <= radius;
      });
    }
    
    if (type === 'rectangle' && coordinates.length >= 2) {
      const minLng = Math.min(...coordinates.map(c => c[0]));
      const maxLng = Math.max(...coordinates.map(c => c[0]));
      const minLat = Math.min(...coordinates.map(c => c[1]));
      const maxLat = Math.max(...coordinates.map(c => c[1]));
      
      return allBoreholes.filter(bh => 
        bh.longitude >= minLng && bh.longitude <= maxLng &&
        bh.latitude >= minLat && bh.latitude <= maxLat
      );
    }
    
    if (type === 'polygon' && coordinates.length >= 3) {
      return allBoreholes.filter(bh => 
        this.pointInPolygon([bh.longitude, bh.latitude], coordinates)
      );
    }
    
    return allBoreholes;
  }

  private pointInPolygon(point: number[], polygon: number[][]): boolean {
    const [px, py] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > py) !== (yj > py)) &&
          (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  findBoreholesNearLine(startPoint: { lng: number; lat: number }, endPoint: { lng: number; lat: number }, tolerance: number = 500): { borehole: Borehole; position: number; distance: number }[] {
    const allBoreholes = Array.from(this.boreholes.values());
    const results: { borehole: Borehole; position: number; distance: number }[] = [];
    
    const lineLength = this.haversineDistance(startPoint, endPoint);
    
    for (const bh of allBoreholes) {
      const { distance, position } = this.pointToLineDistance(
        { lng: bh.longitude, lat: bh.latitude },
        startPoint,
        endPoint
      );
      
      if (distance <= tolerance && position >= 0 && position <= lineLength) {
        results.push({ borehole: bh, position, distance });
      }
    }
    
    return results.sort((a, b) => a.position - b.position);
  }

  private haversineDistance(p1: { lng: number; lat: number }, p2: { lng: number; lat: number }): number {
    const R = 6371000;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private pointToLineDistance(
    point: { lng: number; lat: number },
    lineStart: { lng: number; lat: number },
    lineEnd: { lng: number; lat: number }
  ): { distance: number; position: number } {
    const A = point.lng - lineStart.lng;
    const B = point.lat - lineStart.lat;
    const C = lineEnd.lng - lineStart.lng;
    const D = lineEnd.lat - lineStart.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.lng;
      yy = lineStart.lat;
      param = 0;
    } else if (param > 1) {
      xx = lineEnd.lng;
      yy = lineEnd.lat;
      param = 1;
    } else {
      xx = lineStart.lng + param * C;
      yy = lineStart.lat + param * D;
    }

    const dx = point.lng - xx;
    const dy = point.lat - yy;
    const avgLat = (point.lat + yy) / 2 * Math.PI / 180;
    
    const distance = Math.sqrt(
      (dx * Math.cos(avgLat) * 111000) ** 2 + 
      (dy * 111000) ** 2
    );
    
    const position = param * this.haversineDistance(lineStart, lineEnd);

    return { distance, position };
  }

  saveSectionLine(line: Omit<SectionLine, 'id' | 'createdAt'>): SectionLine {
    const sectionLine: SectionLine = {
      ...line,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.sectionLines.set(sectionLine.id, sectionLine);
    return sectionLine;
  }

  getSectionLines(): SectionLine[] {
    return Array.from(this.sectionLines.values());
  }

  getFaults(): Fault[] {
    return Array.from(this.faults.values());
  }

  getFaultById(id: string): Fault | undefined {
    return this.faults.get(id);
  }

  createFault(data: Omit<Fault, 'id' | 'createdAt'>): Fault {
    const fault: Fault = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.faults.set(fault.id, fault);
    return fault;
  }

  deleteFault(id: string): boolean {
    return this.faults.delete(id);
  }

  findFaultIntersections(
    sectionStart: { lng: number; lat: number },
    sectionEnd: { lng: number; lat: number },
    sectionLength: number,
    minElevation: number,
    maxElevation: number
  ): FaultIntersection[] {
    const intersections: FaultIntersection[] = [];

    for (const fault of this.faults.values()) {
      const intersection = this.lineSegmentIntersection(
        sectionStart, sectionEnd,
        fault.startPoint, fault.endPoint
      );

      if (intersection) {
        const sectionDist = this.haversineDistance(sectionStart, intersection);
        const param = sectionDist / sectionLength;

        if (param >= 0 && param <= 1) {
          intersections.push({
            faultId: fault.id,
            faultName: fault.name,
            faultType: fault.type,
            position: sectionDist,
            dipAngle: fault.dipAngle,
            throwAmount: fault.throwAmount,
            heaveAmount: fault.heaveAmount,
            topElevation: maxElevation,
            bottomElevation: minElevation,
          });
        }
      }
    }

    return intersections.sort((a, b) => a.position - b.position);
  }

  private lineSegmentIntersection(
    p1: { lng: number; lat: number },
    p2: { lng: number; lat: number },
    p3: { lng: number; lat: number },
    p4: { lng: number; lat: number }
  ): { lng: number; lat: number } | null {
    const d1x = p2.lng - p1.lng;
    const d1y = p2.lat - p1.lat;
    const d2x = p4.lng - p3.lng;
    const d2y = p4.lat - p3.lat;

    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((p3.lng - p1.lng) * d2y - (p3.lat - p1.lat) * d2x) / denom;
    const u = ((p3.lng - p1.lng) * d1y - (p3.lat - p1.lat) * d1x) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        lng: p1.lng + t * d1x,
        lat: p1.lat + t * d1y,
      };
    }

    return null;
  }
}

export const store = new InMemoryStore();
