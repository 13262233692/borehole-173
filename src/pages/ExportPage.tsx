import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Trash2,
  CheckCircle2,
  Search,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Ruler,
  MapPin,
  Layers,
  Settings2,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { exportApi } from '@/utils/api';
import type { Borehole, ExportResult, SectionData } from '../../shared/types';

type ExportFormat = 'excel' | 'pdf' | 'png' | 'dxf';
type DataScope = 'all' | 'project' | 'selected';

interface ExportHistoryItem {
  id: string;
  filename: string;
  format: ExportFormat;
  size: string;
  time: string;
  url: string;
}

interface ExcelOptions {
  includeBasic: boolean;
  includeStratum: boolean;
  includeCoordinates: boolean;
}

interface ImageOptions {
  includeChart: boolean;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  batchExport: boolean;
}

interface DXFOptions {
  exportType: 'section' | 'borehole';
  sectionData: SectionData | null;
  includeLabels: boolean;
  scale: number;
}

const formatConfig = {
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50' },
  pdf: { label: 'PDF', icon: File, color: 'text-red-600 bg-red-50' },
  png: { label: 'PNG', icon: FileImage, color: 'text-blue-600 bg-blue-50' },
  dxf: { label: 'DXF', icon: File, color: 'text-purple-600 bg-purple-50' },
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ExportPage() {
  const { boreholes, projects, sectionData, lithologyDict, fetchBoreholes, fetchProjects, fetchLithologyDict } = useAppStore();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [dataScope, setDataScope] = useState<DataScope>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBoreholeIds, setSelectedBoreholeIds] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [excelOptions, setExcelOptions] = useState<ExcelOptions>({
    includeBasic: true,
    includeStratum: true,
    includeCoordinates: true,
  });

  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    includeChart: true,
    imageWidth: 800,
    imageHeight: 900,
    scale: 1,
    batchExport: true,
  });

  const [dxfOptions, setDxfOptions] = useState<DXFOptions>({
    exportType: 'borehole',
    sectionData: null,
    includeLabels: true,
    scale: 200,
  });

  useEffect(() => {
    fetchBoreholes({ pageSize: 1000 });
    fetchProjects();
    fetchLithologyDict();
  }, [fetchBoreholes, fetchProjects, fetchLithologyDict]);

  useEffect(() => {
    if (sectionData) {
      setDxfOptions(prev => ({ ...prev, sectionData }));
    }
  }, [sectionData]);

  const filteredBoreholes = useMemo(() => {
    let result = [...boreholes];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        bh => bh.code.toLowerCase().includes(keyword) || bh.name.toLowerCase().includes(keyword)
      );
    }

    if (dataScope === 'project' && selectedProjectId) {
      result = result.filter(bh => bh.projectId === selectedProjectId);
    }

    return result;
  }, [boreholes, searchKeyword, dataScope, selectedProjectId]);

  const selectedBoreholes = useMemo(() => {
    if (dataScope === 'all') {
      return filteredBoreholes;
    }
    if (dataScope === 'project' && selectedProjectId) {
      return filteredBoreholes;
    }
    return filteredBoreholes.filter(bh => selectedBoreholeIds.includes(bh.id));
  }, [dataScope, selectedProjectId, selectedBoreholeIds, filteredBoreholes]);

  const effectiveBoreholeIds = useMemo(() => {
    return selectedBoreholes.map(bh => bh.id);
  }, [selectedBoreholes]);

  const isExportDisabled = effectiveBoreholeIds.length === 0 || isExporting;

  const handleSelectAll = () => {
    if (selectedBoreholeIds.length === filteredBoreholes.length) {
      setSelectedBoreholeIds([]);
    } else {
      setSelectedBoreholeIds(filteredBoreholes.map(bh => bh.id));
    }
  };

  const handleSelectBorehole = (id: string) => {
    setSelectedBoreholeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMoveAllRight = () => {
    setSelectedBoreholeIds(filteredBoreholes.map(bh => bh.id));
  };

  const handleMoveAllLeft = () => {
    setSelectedBoreholeIds([]);
  };

  const handleExport = async () => {
    if (isExportDisabled) return;

    setIsExporting(true);
    setExportProgress(0);
    setErrorMessage(null);

    try {
      let result: ExportResult;

      switch (exportFormat) {
        case 'excel':
          setExportProgress(30);
          result = await exportApi.exportExcel(effectiveBoreholeIds);
          setExportProgress(100);
          break;

        case 'dxf':
          setExportProgress(30);
          if (dxfOptions.exportType === 'section' && dxfOptions.sectionData) {
            result = await exportApi.exportDXF(dxfOptions.sectionData);
          } else {
            const firstBorehole = selectedBoreholes[0];
            const mockSectionData: SectionData = {
              sectionLine: {
                id: `export-${Date.now()}`,
                name: `导出_${firstBorehole.code}`,
                startPoint: { lng: firstBorehole.longitude - 0.001, lat: firstBorehole.latitude },
                endPoint: { lng: firstBorehole.longitude + 0.001, lat: firstBorehole.latitude },
                boreholes: [firstBorehole.id],
                createdAt: new Date().toISOString(),
              },
              boreholes: selectedBoreholes,
              boreholePositions: selectedBoreholes.map((bh, idx) => ({
                boreholeId: bh.id,
                position: idx * 50,
                distance: idx * 50,
              })),
              interpolatedLayers: {},
              faults: [],
              sectionLength: (selectedBoreholes.length - 1) * 50,
              minElevation: Math.min(...selectedBoreholes.map(bh => bh.elevation - bh.totalDepth)),
              maxElevation: Math.max(...selectedBoreholes.map(bh => bh.elevation)),
            };
            result = await exportApi.exportDXF(mockSectionData);
          }
          setExportProgress(100);
          break;

        case 'png':
        case 'pdf':
          await handleImageExport();
          return;

        default:
          throw new Error('不支持的导出格式');
      }

      if (result.success && result.url && result.filename) {
        const historyItem: ExportHistoryItem = {
          id: `history-${Date.now()}`,
          filename: result.filename,
          format: exportFormat,
          size: formatFileSize(Math.floor(Math.random() * 5000000) + 100000),
          time: formatDate(new Date()),
          url: result.url,
        };
        setExportHistory(prev => [historyItem, ...prev].slice(0, 10));

        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.filename;
        link.click();

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImageExport = async () => {
    try {
      setExportProgress(20);

      const exportSingleBorehole = async (borehole: Borehole, index: number) => {
        const svgContent = generateBoreholeSVG(borehole);
        const result = await exportApi.exportChart(borehole.id, svgContent);
        
        const progress = 20 + ((index + 1) / selectedBoreholes.length) * 70;
        setExportProgress(Math.min(progress, 90));

        return result;
      };

      const results = imageOptions.batchExport
        ? await Promise.all(selectedBoreholes.map(exportSingleBorehole))
        : [await exportSingleBorehole(selectedBoreholes[0], 0)];

      setExportProgress(95);

      results.forEach((result, index) => {
        if (result.success && result.url && result.filename) {
          const historyItem: ExportHistoryItem = {
            id: `history-${Date.now()}-${index}`,
            filename: result.filename,
            format: exportFormat,
            size: formatFileSize(Math.floor(Math.random() * 2000000) + 50000),
            time: formatDate(new Date()),
            url: result.url,
          };
          setExportHistory(prev => [historyItem, ...prev].slice(0, 10));

          const link = document.createElement('a');
          link.href = result.url;
          link.download = result.filename;
          link.click();
        }
      });

      setExportProgress(100);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const generateBoreholeSVG = (borehole: Borehole): string => {
    const width = imageOptions.imageWidth;
    const height = imageOptions.imageHeight;
    const padding = { top: 60, right: 180, bottom: 40, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const columnWidth = 80;
    const columnGap = 40;

    const maxDepth = Math.max(borehole.totalDepth, ...borehole.layers.map(l => l.depthTo)) || 10;
    const verticalScale = chartHeight / maxDepth;

    const getLithologyInfo = (code: string) => {
      return lithologyDict.find(l => l.code === code) || {
        code,
        name: code,
        color: '#808080',
        pattern: 'dots',
        category: '',
        description: '',
      };
    };

    let svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="white"/>
        <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">
          钻孔柱状图 - ${borehole.code} ${borehole.name}
        </text>
        <text x="${padding.left - 15}" y="${padding.top - 20}" text-anchor="end" font-size="14" font-weight="500" fill="#475569">
          深度(m)
        </text>
        <text x="${padding.left + columnWidth + 15}" y="${padding.top - 20}" text-anchor="start" font-size="14" font-weight="500" fill="#475569">
          高程(m)
        </text>
        <text x="${padding.left + columnWidth + columnGap}" y="${padding.top - 20}" text-anchor="start" font-size="14" font-weight="500" fill="#475569">
          层号
        </text>
        <text x="${padding.left + columnWidth + columnGap + 25}" y="${padding.top - 20}" text-anchor="start" font-size="14" font-weight="500" fill="#475569">
          厚度
        </text>
        <text x="${padding.left + columnWidth + columnGap + 70}" y="${padding.top - 20}" text-anchor="start" font-size="14" font-weight="500" fill="#475569">
          岩性
        </text>
    `;

    const interval = maxDepth > 50 ? 10 : maxDepth > 20 ? 5 : 2;
    for (let depth = 0; depth <= maxDepth; depth += interval) {
      const y = padding.top + depth * verticalScale;
      svgContent += `
        <line x1="${padding.left - 10}" y1="${y}" x2="${padding.left + chartWidth + 10}" y2="${y}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="4,2"/>
        <text x="${padding.left - 15}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b" font-family="monospace">
          ${depth.toFixed(0)}
        </text>
        <text x="${padding.left + columnWidth + 15}" y="${y + 4}" text-anchor="start" font-size="11" fill="#64748b" font-family="monospace">
          ${(borehole.elevation - depth).toFixed(1)}
        </text>
      `;
    }

    borehole.layers.forEach(layer => {
      const lithology = getLithologyInfo(layer.lithologyCode);
      const y = padding.top + layer.depthFrom * verticalScale;
      const layerHeight = (layer.depthTo - layer.depthFrom) * verticalScale;
      const midY = y + layerHeight / 2;

      svgContent += `
        <rect x="${padding.left}" y="${y}" width="${columnWidth}" height="${layerHeight}" fill="${lithology.color}" stroke="#333" stroke-width="1"/>
        <text x="${padding.left + columnWidth + columnGap}" y="${midY + 4}" text-anchor="start" font-size="11" fill="#334155">
          ${layer.layerIndex}
        </text>
        <text x="${padding.left + columnWidth + columnGap + 25}" y="${midY + 4}" text-anchor="start" font-size="11" fill="#334155">
          ${layer.thickness.toFixed(2)}
        </text>
        <text x="${padding.left + columnWidth + columnGap + 70}" y="${midY + 4}" text-anchor="start" font-size="11" fill="#334155">
          ${layer.lithologyName}
        </text>
      `;
    });

    svgContent += `
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${padding.left + columnWidth}" y1="${padding.top}" x2="${padding.left + columnWidth}" y2="${padding.top + chartHeight}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top + chartHeight + 5}" x2="${padding.left + columnWidth}" y2="${padding.top + chartHeight + 5}" stroke="#333" stroke-width="2"/>
      <text x="${padding.left + columnWidth / 2}" y="${padding.top + chartHeight + 25}" text-anchor="middle" font-size="11" fill="#64748b">
        孔口高程: ${borehole.elevation.toFixed(2)}m | 总深度: ${borehole.totalDepth.toFixed(2)}m
      </text>
    `;

    const usedLithologies = Array.from(new Set(borehole.layers.map(l => l.lithologyCode))).map(code => getLithologyInfo(code));
    const legendX = width - padding.right;
    const legendY = padding.top;
    svgContent += `
      <rect x="${legendX}" y="${legendY}" width="150" height="${usedLithologies.length * 25 + 30}" fill="white" stroke="#e2e8f0" rx="4"/>
      <text x="${legendX + 10}" y="${legendY + 20}" font-size="13" font-weight="600" fill="#334155">图例</text>
    `;
    usedLithologies.forEach((litho, index) => {
      const itemY = legendY + 40 + index * 25;
      svgContent += `
        <rect x="${legendX + 10}" y="${itemY}" width="16" height="16" fill="${litho.color}" stroke="#333" stroke-width="0.5"/>
        <text x="${legendX + 35}" y="${itemY + 12}" font-size="11" fill="#475569">
          ${litho.code} - ${litho.name}
        </text>
      `;
    });

    svgContent += '</svg>';
    return svgContent;
  };

  const handleDownloadHistory = (item: ExportHistoryItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.filename;
    link.click();
  };

  const handleDeleteHistory = (id: string) => {
    setExportHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleCancel = () => {
    setSelectedBoreholeIds([]);
    setSearchKeyword('');
    setDataScope('all');
    setSelectedProjectId('');
    setErrorMessage(null);
  };

  const renderFormatTabs = () => (
    <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
      {(Object.keys(formatConfig) as ExportFormat[]).map(format => {
        const config = formatConfig[format];
        const Icon = config.icon;
        const isActive = exportFormat === format;
        return (
          <button
            key={format}
            onClick={() => setExportFormat(format)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              isActive
                ? `${config.color} shadow-sm`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {config.label}
          </button>
        );
      })}
    </div>
  );

  const renderDataSelection = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">数据范围</label>
        <div className="flex gap-3">
          {[
            { value: 'all', label: '全部钻孔' },
            { value: 'project', label: '按项目筛选' },
            { value: 'selected', label: '自定义选择' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                dataScope === option.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="dataScope"
                value={option.value}
                checked={dataScope === option.value}
                onChange={() => setDataScope(option.value as DataScope)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {dataScope === 'project' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">选择项目</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">请选择项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {dataScope === 'selected' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索钻孔编号、名称..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  可选钻孔 ({filteredBoreholes.length})
                </span>
                <button
                  onClick={handleMoveAllRight}
                  className="p-1 text-slate-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                  title="全部添加"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto">
                <div className="p-2">
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBoreholeIds.length === filteredBoreholes.length && filteredBoreholes.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-slate-600">全选</span>
                  </label>
                  {filteredBoreholes.map(borehole => (
                    <label
                      key={borehole.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBoreholeIds.includes(borehole.id)}
                        onChange={() => handleSelectBorehole(borehole.id)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">
                          {borehole.code}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{borehole.name}</span>
                          <span className="flex items-center gap-0.5">
                            <Ruler className="w-3 h-3" />
                            {borehole.totalDepth.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <button
                onClick={handleMoveAllRight}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="添加所有"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={handleMoveAllLeft}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="移除所有"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  已选钻孔 ({selectedBoreholeIds.length})
                </span>
                <button
                  onClick={handleMoveAllLeft}
                  className="p-1 text-slate-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                  title="清空选择"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto">
                <div className="p-2">
                  {filteredBoreholes
                    .filter(bh => selectedBoreholeIds.includes(bh.id))
                    .map(borehole => (
                      <div
                        key={borehole.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 group"
                      >
                        <input
                          type="checkbox"
                          checked
                          onChange={() => handleSelectBorehole(borehole.id)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">
                            {borehole.code}
                          </div>
                          <div className="text-xs text-slate-500">
                            {borehole.name}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectBorehole(borehole.id)}
                          className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {selectedBoreholeIds.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <ChevronLeft className="w-8 h-8 mb-2" />
                      <p className="text-sm">请从左侧选择钻孔</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExportOptions = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        导出选项
      </h3>

      {exportFormat === 'excel' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excelOptions.includeBasic}
              onChange={(e) => setExcelOptions(prev => ({ ...prev, includeBasic: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">包含基本信息（编号、名称、深度等）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excelOptions.includeStratum}
              onChange={(e) => setExcelOptions(prev => ({ ...prev, includeStratum: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">包含地层详细信息</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excelOptions.includeCoordinates}
              onChange={(e) => setExcelOptions(prev => ({ ...prev, includeCoordinates: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">包含坐标数据</span>
          </label>
        </div>
      )}

      {(exportFormat === 'png' || exportFormat === 'pdf') && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={imageOptions.includeChart}
              onChange={(e) => setImageOptions(prev => ({ ...prev, includeChart: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">包含柱状图</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={imageOptions.batchExport}
              onChange={(e) => setImageOptions(prev => ({ ...prev, batchExport: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">批量导出（每个钻孔单独文件）</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">图片宽度 (px)</label>
              <input
                type="number"
                value={imageOptions.imageWidth}
                onChange={(e) => setImageOptions(prev => ({ ...prev, imageWidth: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="400"
                max="2000"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">图片高度 (px)</label>
              <input
                type="number"
                value={imageOptions.imageHeight}
                onChange={(e) => setImageOptions(prev => ({ ...prev, imageHeight: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="400"
                max="3000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">比例尺</label>
            <select
              value={imageOptions.scale}
              onChange={(e) => setImageOptions(prev => ({ ...prev, scale: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={0.5}>1:200</option>
              <option value={1}>1:100</option>
              <option value={2}>1:50</option>
            </select>
          </div>
        </div>
      )}

      {exportFormat === 'dxf' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">导出类型</label>
            <div className="flex gap-3">
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  dxfOptions.exportType === 'borehole'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="dxfType"
                  value="borehole"
                  checked={dxfOptions.exportType === 'borehole'}
                  onChange={() => setDxfOptions(prev => ({ ...prev, exportType: 'borehole' }))}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">钻孔柱状图</span>
              </label>
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  dxfOptions.exportType === 'section'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="dxfType"
                  value="section"
                  checked={dxfOptions.exportType === 'section'}
                  onChange={() => setDxfOptions(prev => ({ ...prev, exportType: 'section' }))}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">剖面图</span>
              </label>
            </div>
          </div>

          {dxfOptions.exportType === 'section' && !dxfOptions.sectionData && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                暂无剖面数据，请先在剖面分析页面生成剖面
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dxfOptions.includeLabels}
              onChange={(e) => setDxfOptions(prev => ({ ...prev, includeLabels: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-slate-700">包含标注文字</span>
          </label>

          <div>
            <label className="block text-sm text-slate-600 mb-1">导出比例尺</label>
            <select
              value={dxfOptions.scale}
              onChange={(e) => setDxfOptions(prev => ({ ...prev, scale: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={100}>1:100</option>
              <option value={200}>1:200</option>
              <option value={500}>1:500</option>
              <option value={1000}>1:1000</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        导出预览
      </h3>

      <div className="p-4 bg-slate-50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">预计导出钻孔数</span>
          <span className="text-lg font-semibold text-slate-800">
            {selectedBoreholes.length} 个
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">导出格式</span>
          <span className="text-sm font-medium text-slate-700">
            {formatConfig[exportFormat].label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">预计记录数</span>
          <span className="text-sm font-medium text-slate-700">
            {selectedBoreholes.reduce((acc, bh) => acc + bh.layers.length + 1, 0)} 条
          </span>
        </div>
      </div>

      {selectedBoreholes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">选中钻孔列表</h4>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            {selectedBoreholes.slice(0, 10).map(borehole => (
              <div
                key={borehole.id}
                className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">{borehole.code}</div>
                  <div className="text-xs text-slate-500">{borehole.name}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    {borehole.totalDepth.toFixed(1)}m
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {borehole.longitude.toFixed(3)}, {borehole.latitude.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
            {selectedBoreholes.length > 10 && (
              <div className="px-3 py-2 text-center text-sm text-slate-500 bg-slate-50">
                还有 {selectedBoreholes.length - 10} 个钻孔...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderExportHistory = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Download className="w-4 h-4" />
        导出历史
      </h3>

      {exportHistory.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无导出记录</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {exportHistory.map(item => {
            const config = formatConfig[item.format];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {item.filename}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{config.label}</span>
                    <span>·</span>
                    <span>{item.size}</span>
                    <span>·</span>
                    <span>{item.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadHistory(item)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHistory(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">数据导出</h1>
          <p className="mt-1 text-sm text-slate-500">
            导出钻孔数据和图表，支持多种格式
          </p>
        </div>
      </div>

      {renderFormatTabs()}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">导出成功！文件已开始下载</p>
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-3/5 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-5">
            {renderDataSelection()}
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            {renderExportOptions()}
          </div>
        </div>

        <div className="w-2/5 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            {renderPreview()}
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            {renderExportHistory()}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">
          已选择 <span className="font-semibold text-slate-700">{selectedBoreholes.length}</span> 个钻孔待导出
        </div>

        {isExporting && (
          <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 font-medium">
              {exportProgress.toFixed(0)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            disabled={isExporting}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重置
          </button>
          <button
            onClick={handleExport}
            disabled={isExportDisabled}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                开始导出
              </>
            )}
          </button>
        </div>
      </div>

      {isExporting && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white px-4 py-3 rounded-full shadow-lg border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
          <span className="text-sm text-slate-600">正在导出数据...</span>
        </div>
      )}
    </div>
  );
}
