import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Circle,
  Square,
  Pentagon,
  Eraser,
  Download,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Ruler,
  Mountain,
  Calendar,
  Filter,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { BoreholeMap } from '@/components/map/BoreholeMap';
import type { DrawMode, DrawResult } from '@/components/map/BoreholeMap';
import { spatialApi, exportApi } from '@/utils/api';
import type { SpatialQuery, Borehole } from '../../shared/types';

const queryTypes = [
  { type: 'point' as const, label: '点查询', icon: MapPin },
  { type: 'circle' as const, label: '圆查询', icon: Circle },
  { type: 'rectangle' as const, label: '矩形查询', icon: Square },
  { type: 'polygon' as const, label: '多边形查询', icon: Pentagon },
];

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  approved: { label: '已审核', className: 'bg-blue-100 text-blue-700' },
};

export default function SpatialQuery() {
  const { boreholes, lithologyDict, projects, loading, fetchBoreholes, fetchLithologyDict, fetchProjects, setError } = useAppStore();

  const [queryType, setQueryType] = useState<'point' | 'circle' | 'rectangle' | 'polygon'>('point');
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [highlightedBoreholeIds, setHighlightedBoreholeIds] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<Borehole[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [minDepth, setMinDepth] = useState<string>('');
  const [maxDepth, setMaxDepth] = useState<string>('');
  const [selectedLithologyCodes, setSelectedLithologyCodes] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [filterExpanded, setFilterExpanded] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchBoreholes({ pageSize: 1000 });
    fetchLithologyDict();
    fetchProjects();
  }, [fetchBoreholes, fetchLithologyDict, fetchProjects]);

  const handleQueryTypeChange = (type: 'point' | 'circle' | 'rectangle' | 'polygon') => {
    setQueryType(type);
    setDrawMode(type);
    setDrawResult(null);
    setHighlightedBoreholeIds([]);
    setQueryResults([]);
  };

  const handleDrawComplete = (result: DrawResult) => {
    if (result.type !== 'section' && result.type !== 'none') {
      setDrawResult(result);
      setDrawMode('none');
    }
  };

  const handleClearDrawing = () => {
    setDrawResult(null);
    setDrawMode('none');
    setHighlightedBoreholeIds([]);
    setQueryResults([]);
  };

  const handleLithologyToggle = (code: string) => {
    setSelectedLithologyCodes(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleQuery = async () => {
    if (!drawResult) return;

    setIsQuerying(true);
    setError(null);

    try {
      const filters: SpatialQuery['filters'] = {};
      if (minDepth) filters.minDepth = Number(minDepth);
      if (maxDepth) filters.maxDepth = Number(maxDepth);
      if (selectedLithologyCodes.length > 0) filters.lithologyCodes = selectedLithologyCodes;
      if (selectedProjectId) filters.projectId = selectedProjectId;
      if (startDate && endDate) filters.dateRange = [startDate, endDate];

      const query: SpatialQuery = {
        type: drawResult.type as 'point' | 'circle' | 'rectangle' | 'polygon',
        coordinates: drawResult.coordinates,
        radius: drawResult.radius,
        filters,
      };

      const results = await spatialApi.query(query);
      setQueryResults(results);
      setHighlightedBoreholeIds(results.map(b => b.id));
      setCurrentPage(1);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || '空间查询失败');
      } else {
        setError('空间查询失败');
      }
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReset = () => {
    setDrawResult(null);
    setDrawMode('none');
    setHighlightedBoreholeIds([]);
    setQueryResults([]);
    setMinDepth('');
    setMaxDepth('');
    setSelectedLithologyCodes([]);
    setSelectedProjectId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (queryResults.length === 0) return;

    setIsExporting(true);
    try {
      const boreholeIds = queryResults.map(b => b.id);
      const result = await exportApi.exportExcel(boreholeIds);
      if (result.success && result.url) {
        const link = document.createElement('a');
        link.href = exportApi.downloadUrl(result.filename || '');
        link.download = result.filename || 'boreholes.xlsx';
        link.click();
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || '导出失败');
      } else {
        setError('导出失败');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const statistics = useMemo(() => {
    if (queryResults.length === 0) return null;
    const depths = queryResults.map(b => b.totalDepth);
    return {
      count: queryResults.length,
      avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
      maxDepth: Math.max(...depths),
      minDepth: Math.min(...depths),
    };
  }, [queryResults]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return queryResults.slice(start, start + pageSize);
  }, [queryResults, currentPage]);

  const totalPages = Math.ceil(queryResults.length / pageSize);

  const formatCoordinates = (coords: number[][]) => {
    return coords.map(([lng, lat]) => `${lng.toFixed(4)}, ${lat.toFixed(4)}`).join(' → ');
  };

  const getQueryTypeLabel = (type: string) => {
    const found = queryTypes.find(q => q.type === type);
    return found ? found.label : type;
  };

  const canQuery = drawResult !== null && !isQuerying;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">空间查询</h1>
          <p className="mt-1 text-sm text-slate-500">
            在地图上绘制查询区域，筛选符合条件的钻孔数据
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearDrawing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Eraser className="w-4 h-4" />
            清除绘制
          </button>
          <button
            onClick={handleExport}
            disabled={queryResults.length === 0 || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            导出结果
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-3/5 flex flex-col">
          <BoreholeMap
            boreholes={boreholes}
            showDrawTools={true}
            drawMode={drawMode}
            onDrawComplete={handleDrawComplete}
            onDrawModeChange={setDrawMode}
            queryGeometry={drawResult}
            highlightedBoreholeIds={highlightedBoreholeIds}
            height={600}
            className="flex-1 min-h-0"
          />
        </div>

        <div className="w-2/5 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">查询类型</h3>
            <div className="grid grid-cols-4 gap-2">
              {queryTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleQueryTypeChange(type)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg transition-all ${
                    queryType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {drawResult && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                查询参数
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">查询类型:</span>
                  <span className="text-slate-700 font-medium">{getQueryTypeLabel(drawResult.type)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 flex-shrink-0">坐标:</span>
                  <span className="text-slate-700 font-mono text-xs break-all text-right">
                    {formatCoordinates(drawResult.coordinates)}
                  </span>
                </div>
                {drawResult.radius !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">半径:</span>
                    <span className="text-slate-700 font-mono">{drawResult.radius.toFixed(2)} m</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setFilterExpanded(!filterExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                筛选条件
              </span>
              {filterExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {filterExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    深度范围 (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={minDepth}
                      onChange={(e) => setMinDepth(e.target.value)}
                      placeholder="最小深度"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="number"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(e.target.value)}
                      placeholder="最大深度"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Mountain className="w-4 h-4" />
                    岩性筛选
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                    {lithologyDict.map((item) => (
                      <label
                        key={item.code}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLithologyCodes.includes(item.code)}
                          onChange={() => handleLithologyToggle(item.code)}
                          className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                        />
                        <span
                          className="w-4 h-4 rounded border border-slate-200 flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-700">{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">项目</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">全部项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    日期范围
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleQuery}
              disabled={!canQuery}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isQuerying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              查询
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={handleExport}
              disabled={queryResults.length === 0 || isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </button>
          </div>

          {statistics && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{statistics.count}</p>
                <p className="text-xs text-slate-500 mt-0.5">钻孔数</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{statistics.avgDepth.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-0.5">平均深度</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{statistics.maxDepth.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-0.5">最大深度</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{statistics.minDepth.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-0.5">最小深度</p>
              </div>
            </div>
          )}

          <div className="flex-1 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                查询结果
                {queryResults.length > 0 && (
                  <span className="ml-2 text-xs text-slate-500">共 {queryResults.length} 条</span>
                )}
              </h3>
            </div>

            {isQuerying ? (
              <div className="flex-1 p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : queryResults.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">暂无查询结果</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {drawResult ? '请调整查询条件后重试' : '请先在地图上绘制查询区域'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          钻孔编号
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          名称
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          深度
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          高程
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          项目
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedResults.map((borehole) => (
                        <tr key={borehole.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-sm font-medium text-slate-700">
                            {borehole.code}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">
                            {borehole.name || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">
                            {borehole.totalDepth.toFixed(1)}m
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">
                            {borehole.elevation.toFixed(2)}m
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">
                            {borehole.projectName || '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusMap[borehole.status]?.className || 'bg-slate-100 text-slate-600'}`}>
                              {statusMap[borehole.status]?.label || borehole.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                              <Eye className="w-3.5 h-3.5" />
                              详情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, queryResults.length)} 条，共 {queryResults.length} 条
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        上一页
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 text-sm rounded transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
          <span className="text-sm text-slate-600">加载中...</span>
        </div>
      )}
    </div>
  );
}
