import * as XLSX from 'xlsx';
import Drawing from 'dxf-writer';
import type { Borehole, SectionData, ExportResult } from '../../shared/types';
import { boreholeRepository } from '../repositories/BoreholeRepository';
import * as fs from 'fs';
import * as path from 'path';

export class ExportService {
  async exportToExcel(boreholeIds: string[]): Promise<ExportResult> {
    try {
      const boreholes = boreholeIds.length > 0
        ? boreholeIds.map(id => boreholeRepository.findById(id)).filter(Boolean) as Borehole[]
        : boreholeRepository.findAll();

      const wb = XLSX.utils.book_new();

      const summaryData = boreholes.map(bh => ({
        '钻孔编号': bh.code,
        '钻孔名称': bh.name,
        '经度': bh.longitude,
        '纬度': bh.latitude,
        '孔口高程(m)': bh.elevation,
        '总深度(m)': bh.totalDepth,
        '施工日期': bh.drillingDate,
        '项目': bh.projectName || '',
        '施工单位': bh.driller,
        '记录员': bh.recorder,
        '地质工程师': bh.geologist,
        '状态': bh.status,
      }));
      
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, '钻孔一览表');

      const layerData: Record<string, string | number>[] = [];
      boreholes.forEach(bh => {
        bh.layers.forEach(layer => {
          layerData.push({
            '钻孔编号': bh.code,
            '层号': layer.layerIndex,
            '层顶深度(m)': layer.depthFrom,
            '层底深度(m)': layer.depthTo,
            '厚度(m)': layer.thickness,
            '岩性代码': layer.lithologyCode,
            '岩性名称': layer.lithologyName,
            '岩性描述': layer.lithologyDesc,
            '颜色': layer.color,
            '结构构造': layer.structure,
            '风化程度': layer.weathering,
            '备注': layer.remarks,
          });
        });
      });
      
      const ws2 = XLSX.utils.json_to_sheet(layerData);
      XLSX.utils.book_append_sheet(wb, ws2, '地层分层');

      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filename = `钻孔数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const filepath = path.join(exportDir, filename);
      
      XLSX.writeFile(wb, filepath);

      return {
        success: true,
        url: `/exports/${filename}`,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      };
    }
  }

  generateDXF(sectionData: SectionData): ExportResult {
    try {
      const dxf = new Drawing();

      dxf.setUnits('Meters');
      dxf.addLineType('DASHED', 'Dashed pattern', [0.5, -0.5]);
      dxf.addLayer('钻孔', Drawing.ACI.BLUE, 'CONTINUOUS');
      dxf.addLayer('地层界线', Drawing.ACI.RED, 'CONTINUOUS');
      dxf.addLayer('岩性填充', Drawing.ACI.GREEN, 'CONTINUOUS');
      dxf.addLayer('标注', Drawing.ACI.WHITE, 'CONTINUOUS');
      dxf.addLayer('网格', Drawing.ACI.LAYER, 'DASHED');

      const { boreholes, boreholePositions, sectionLength, minElevation, maxElevation } = sectionData;
      const height = maxElevation - minElevation;
      const scaleX = 500;
      const scaleY = 500;

      const gridSpacing = 10;
      dxf.setActiveLayer('网格');
      for (let x = 0; x <= sectionLength; x += gridSpacing) {
        dxf.drawLine(
          x / scaleX, 0,
          x / scaleX, height / scaleY
        );
      }
      for (let y = 0; y <= height; y += gridSpacing) {
        dxf.drawLine(
          0, y / scaleY,
          sectionLength / scaleX, y / scaleY
        );
      }

      dxf.setActiveLayer('钻孔');
      boreholePositions.forEach(({ boreholeId, position }) => {
        const borehole = boreholes.find(b => b.id === boreholeId)!;
        const x = position / scaleX;
        const groundY = (borehole.elevation - minElevation) / scaleY;
        const bottomY = (borehole.elevation - borehole.totalDepth - minElevation) / scaleY;
        
        dxf.drawLine(x, groundY, x, bottomY);
        
        dxf.setActiveLayer('标注');
        dxf.drawText(
          x - 0.5,
          groundY + 0.2,
          0.15,
          0,
          borehole.code
        );
        dxf.drawText(
          x + 0.1,
          groundY,
          0.1,
          0,
          `${borehole.elevation.toFixed(1)}m`
        );
        dxf.setActiveLayer('钻孔');
      });

      dxf.setActiveLayer('地层界线');
      for (let i = 0; i < boreholes.length - 1; i++) {
        const bh1 = boreholes[i];
        const bh2 = boreholes[i + 1];
        const pos1 = boreholePositions[i].position;
        const pos2 = boreholePositions[i + 1].position;

        const maxLayers = Math.max(bh1.layers.length, bh2.layers.length);
        
        for (let j = 0; j < maxLayers; j++) {
          const layer1 = bh1.layers[j];
          const layer2 = bh2.layers[j];
          
          if (layer1 && layer2) {
            const x1 = pos1 / scaleX;
            const x2 = pos2 / scaleX;
            const y1Top = (bh1.elevation - layer1.depthFrom - minElevation) / scaleY;
            const y1Bot = (bh1.elevation - layer1.depthTo - minElevation) / scaleY;
            const y2Top = (bh2.elevation - layer2.depthFrom - minElevation) / scaleY;
            const y2Bot = (bh2.elevation - layer2.depthTo - minElevation) / scaleY;

            dxf.drawLine(x1, y1Top, x2, y2Top);
            dxf.drawLine(x1, y1Bot, x2, y2Bot);
          }
        }
      }

      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filename = `剖面图_${new Date().toISOString().slice(0, 10)}.dxf`;
      const filepath = path.join(exportDir, filename);
      
      fs.writeFileSync(filepath, dxf.toDxfString());

      return {
        success: true,
        url: `/exports/${filename}`,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DXF导出失败',
      };
    }
  }

  async exportChartSVG(boreholeId: string, svgContent: string): Promise<ExportResult> {
    try {
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filename = `柱状图_${boreholeId}_${new Date().toISOString().slice(0, 10)}.svg`;
      const filepath = path.join(exportDir, filename);
      
      fs.writeFileSync(filepath, svgContent);

      return {
        success: true,
        url: `/exports/${filename}`,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      };
    }
  }
}

export const exportService = new ExportService();
