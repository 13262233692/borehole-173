import { Request, Response } from 'express';
import { spatialService } from '../services/SpatialService';
import { boreholeService } from '../services/BoreholeService';

export class SpatialController {
  async spatialQuery(req: Request, res: Response) {
    try {
      const query = req.body;
      const results = spatialService.spatialQuery(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '空间查询失败' });
    }
  }

  async findNearby(req: Request, res: Response) {
    try {
      const { lng, lat, radius } = req.query;
      
      if (!lng || !lat || !radius) {
        return res.status(400).json({ error: '缺少必要参数: lng, lat, radius' });
      }

      const results = spatialService.findNearby(
        Number(lng),
        Number(lat),
        Number(radius)
      );

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '附近钻孔查询失败' });
    }
  }

  async findBoreholesNearLine(req: Request, res: Response) {
    try {
      const { startLng, startLat, endLng, endLat, tolerance } = req.query;
      
      if (!startLng || !startLat || !endLng || !endLat) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      const results = spatialService.findBoreholesNearLine(
        { lng: Number(startLng), lat: Number(startLat) },
        { lng: Number(endLng), lat: Number(endLat) },
        tolerance ? Number(tolerance) : 500
      );

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '沿线钻孔查询失败' });
    }
  }

  async getStatistics(req: Request, res: Response) {
    try {
      const stats = spatialService.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取统计数据失败' });
    }
  }

  async getFaults(req: Request, res: Response) {
    try {
      const faults = boreholeService.getFaults();
      res.json(faults);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取断层数据失败' });
    }
  }

  async createFault(req: Request, res: Response) {
    try {
      const fault = boreholeService.getFaults();
      res.json(fault);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '创建断层失败' });
    }
  }

  async deleteFault(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = spatialService.deleteFault(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '删除断层失败' });
    }
  }
}

export const spatialController = new SpatialController();
