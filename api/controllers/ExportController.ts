import { Request, Response } from 'express';
import { exportService } from '../services/ExportService';
import * as path from 'path';
import * as fs from 'fs';

export class ExportController {
  async exportExcel(req: Request, res: Response) {
    try {
      const { boreholeIds } = req.body;
      const result = await exportService.exportToExcel(boreholeIds || []);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '导出Excel失败' 
      });
    }
  }

  async exportDXF(req: Request, res: Response) {
    try {
      const { sectionData } = req.body;
      const result = exportService.generateDXF(sectionData);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '导出DXF失败' 
      });
    }
  }

  async exportChartSVG(req: Request, res: Response) {
    try {
      const { boreholeId, svgContent } = req.body;
      const result = await exportService.exportChartSVG(boreholeId, svgContent);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '导出SVG失败' 
      });
    }
  }

  async downloadFile(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      const exportDir = path.join(process.cwd(), 'exports');
      const filepath = path.join(exportDir, filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: '文件不存在' });
      }

      res.download(filepath, filename);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '下载失败' });
    }
  }
}

export const exportController = new ExportController();
