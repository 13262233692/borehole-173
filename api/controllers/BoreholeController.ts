import { Request, Response } from 'express';
import type { BoreholeFilters } from '../../shared/types';
import { boreholeService } from '../services/BoreholeService';

export class BoreholeController {
  async getBoreholes(req: Request, res: Response) {
    try {
      const { page, pageSize, keyword, projectId, minDepth, maxDepth, lithologyCodes } = req.query;
      
      const filters: BoreholeFilters = {};
      if (keyword) filters.keyword = String(keyword);
      if (projectId) filters.projectId = String(projectId);
      if (minDepth) filters.minDepth = Number(minDepth);
      if (maxDepth) filters.maxDepth = Number(maxDepth);
      if (lithologyCodes) filters.lithologyCodes = String(lithologyCodes).split(',');

      const result = boreholeService.getBoreholes(
        page ? Number(page) : undefined,
        pageSize ? Number(pageSize) : undefined,
        filters
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取钻孔列表失败' });
    }
  }

  async getBoreholeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const borehole = boreholeService.getBoreholeById(id);
      
      if (!borehole) {
        return res.status(404).json({ error: '钻孔不存在' });
      }

      res.json(borehole);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取钻孔详情失败' });
    }
  }

  async createBorehole(req: Request, res: Response) {
    try {
      const data = req.body;
      const borehole = boreholeService.createBorehole(data);
      res.status(201).json(borehole);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '创建钻孔失败' });
    }
  }

  async updateBorehole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const borehole = boreholeService.updateBorehole(id, data);
      
      if (!borehole) {
        return res.status(404).json({ error: '钻孔不存在' });
      }

      res.json(borehole);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '更新钻孔失败' });
    }
  }

  async deleteBorehole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = boreholeService.deleteBorehole(id);
      
      if (!success) {
        return res.status(404).json({ error: '钻孔不存在' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '删除钻孔失败' });
    }
  }

  async addLayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const layer = req.body;
      const newLayer = boreholeService.addLayer(id, layer);
      
      if (!newLayer) {
        return res.status(404).json({ error: '钻孔不存在' });
      }

      res.status(201).json(newLayer);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '添加地层失败' });
    }
  }

  async updateLayer(req: Request, res: Response) {
    try {
      const { id, layerId } = req.params;
      const data = req.body;
      const layer = boreholeService.updateLayer(id, layerId, data);
      
      if (!layer) {
        return res.status(404).json({ error: '钻孔或地层不存在' });
      }

      res.json(layer);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '更新地层失败' });
    }
  }

  async deleteLayer(req: Request, res: Response) {
    try {
      const { id, layerId } = req.params;
      const success = boreholeService.deleteLayer(id, layerId);
      
      if (!success) {
        return res.status(404).json({ error: '钻孔或地层不存在' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '删除地层失败' });
    }
  }

  async getLithologyDict(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const dict = boreholeService.getLithologyDict(category ? String(category) : undefined);
      res.json(dict);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取岩性字典失败' });
    }
  }

  async getProjects(req: Request, res: Response) {
    try {
      const projects = boreholeService.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取项目列表失败' });
    }
  }

  async generateSection(req: Request, res: Response) {
    try {
      const { startPoint, endPoint, tolerance } = req.body;
      const sectionData = boreholeService.generateSectionData(
        startPoint,
        endPoint,
        tolerance || 500
      );
      
      if (!sectionData) {
        return res.status(404).json({ error: '剖面线范围内没有钻孔数据' });
      }

      res.json(sectionData);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '生成剖面数据失败' });
    }
  }

  async saveSectionLine(req: Request, res: Response) {
    try {
      const line = req.body;
      const saved = boreholeService.saveSectionLine(line);
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '保存剖面线失败' });
    }
  }

  async getSectionLines(req: Request, res: Response) {
    try {
      const lines = boreholeService.getSectionLines();
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '获取剖面线列表失败' });
    }
  }
}

export const boreholeController = new BoreholeController();
