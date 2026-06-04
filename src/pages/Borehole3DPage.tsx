import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid3x3,
  Move3d,
  Eye,
  Layers,
  Settings2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  MapPin,
  Ruler,
  Calendar,
  User,
  BookOpen,
  ChevronRight,
  Loader2,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Borehole3DViewer } from '@/components/chart/Borehole3DViewer';
import { spatialApi } from '@/utils/api';
import type { Borehole, Fault } from '../../shared/types';

export default function Borehole3DPage() {
  const {
    boreholes,
    lithologyDict,
    loading,
    fetchBoreholes,
    fetchLithologyDict,
  } = useAppStore();

  const [selectedBorehole, setSelectedBorehole] = useState<Borehole | null>(null);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showFaults, setShowFaults] = useState(true);
  const [verticalExaggeration, setVerticalExaggeration] = useState(5);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const loadFaults = useCallback(async () => {
    try {
      const data = await spatialApi.getFaults();
      setFaults(data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchBoreholes({ pageSize: 1000 });
    fetchLithologyDict();
    loadFaults();
  }, [fetchBoreholes, fetchLithologyDict, loadFaults]);

  const handleBoreholeSelect = useCallback((borehole: Borehole | null) => {
    setSelectedBorehole(borehole);
  }, []);

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

  const usedLithologies = [...new Set(boreholes.flatMap(bh => bh.layers.map(l => l.lithologyCode)))]
    .map(code => getLithologyInfo(code));

  const totalDepth = boreholes.reduce((sum, bh) => sum + bh.totalDepth, 0);
  const avgDepth = boreholes.length > 0 ? totalDepth / boreholes.length : 0;
  const maxDepth = boreholes.length > 0 ? Math.max(...boreholes.map(bh => bh.totalDepth)) : 0;

  const displayedFaults = showFaults ? faults : [];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Box className="w-6 h-6 text-primary-600" />
            三维钻孔可视化
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            三维场景中展示所有钻孔，支持旋转、缩放查看地层空间展布
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-primary-500" />
            <span>{boreholes.length} 个钻孔</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg border border-slate-200">
            <Ruler className="w-3.5 h-3.5 text-green-500" />
            <span>最大 {maxDepth.toFixed(0)}m</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg border border-slate-200">
            <Move3d className="w-3.5 h-3.5 text-amber-500" />
            <span>平均 {avgDepth.toFixed(0)}m</span>
          </div>
          {faults.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-red-50 rounded-lg border border-red-200">
              <Zap className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600">{faults.length} 条断层</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1.5">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  showGrid
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                网格
              </button>
              <button
                onClick={() => setShowAxes(!showAxes)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  showAxes
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Move3d className="w-3.5 h-3.5" />
                坐标轴
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  showLabels
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                标签
              </button>
              {faults.length > 0 && (
                <button
                  onClick={() => setShowFaults(!showFaults)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    showFaults
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  断层
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <span className="text-xs text-slate-500">垂直放大:</span>
              <select
                value={verticalExaggeration}
                onChange={(e) => setVerticalExaggeration(Number(e.target.value))}
                className="px-2 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={5}>5×</option>
                <option value={10}>10×</option>
                <option value={20}>20×</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1.5">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  showLegend
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                图例
              </button>
              <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  showInfoPanel
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                信息
              </button>
            </div>

            <div className="flex-1" />

            <div className="text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />
                鼠标左键旋转 · 滚轮缩放 · 右键平移
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Borehole3DViewer
              boreholes={boreholes}
              lithologyDict={lithologyDict}
              faults={displayedFaults}
              onBoreholeSelect={handleBoreholeSelect}
              selectedBoreholeId={selectedBorehole?.id}
              showGrid={showGrid}
              showAxes={showAxes}
              showLabels={showLabels}
              verticalExaggeration={verticalExaggeration}
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                  <span className="text-sm text-slate-600">加载三维场景中...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-72 flex flex-col gap-3 flex-shrink-0 overflow-y-auto">
          {showLegend && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary-600" />
                岩性图例
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {usedLithologies.map((litho) => (
                  <div
                    key={litho.code}
                    className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-50"
                  >
                    <div
                      className="w-4 h-4 rounded border border-slate-300 flex-shrink-0"
                      style={{ backgroundColor: litho.color }}
                    />
                    <span className="text-xs text-slate-600 font-mono">{litho.code}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 truncate">{litho.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showFaults && faults.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-red-500" />
                断层
              </h3>
              <div className="space-y-2">
                {faults.map((fault) => {
                  const isNormal = fault.type === 'normal';
                  const isReverse = fault.type === 'reverse';
                  const typeColor = isNormal
                    ? 'bg-red-100 text-red-700'
                    : isReverse
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700';
                  const typeLabel = isNormal ? '正' : isReverse ? '逆' : '走滑';

                  return (
                    <div key={fault.id} className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${typeColor}`}>
                          {typeLabel}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{fault.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 font-mono">
                        倾角{fault.dipAngle}° · 落差{fault.throwAmount}m
                      </div>
                      {fault.description && (
                        <div className="mt-1 text-xs text-slate-400 truncate">
                          {fault.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showInfoPanel && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary-600" />
                钻孔信息
              </h3>

              {selectedBorehole ? (
                <div className="space-y-3">
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="text-lg font-bold text-primary-700">{selectedBorehole.code}</div>
                    <div className="text-sm text-primary-600 mt-0.5">{selectedBorehole.name}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">位置:</span>
                      <span className="text-slate-700 font-mono">
                        {selectedBorehole.longitude.toFixed(4)}, {selectedBorehole.latitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">深度:</span>
                      <span className="text-slate-700 font-mono">{selectedBorehole.totalDepth.toFixed(1)} m</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Move3d className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">高程:</span>
                      <span className="text-slate-700 font-mono">{selectedBorehole.elevation.toFixed(1)} m</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">地层:</span>
                      <span className="text-slate-700">{selectedBorehole.layers.length} 层</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">日期:</span>
                      <span className="text-slate-700">
                        {new Date(selectedBorehole.drillingDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">施工:</span>
                      <span className="text-slate-700">{selectedBorehole.driller}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      地层明细
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedBorehole.layers.map((layer) => {
                        const litho = getLithologyInfo(layer.lithologyCode);
                        return (
                          <div
                            key={layer.id}
                            className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded"
                          >
                            <div
                              className="w-3 h-3 rounded-sm border border-slate-300 flex-shrink-0"
                              style={{ backgroundColor: litho.color }}
                            />
                            <span className="text-xs font-mono text-slate-600 w-10">
                              {layer.depthFrom}-{layer.depthTo}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({layer.thickness.toFixed(1)}m)
                            </span>
                            <span className="text-xs text-slate-700 truncate flex-1">
                              {litho.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">点击三维场景中的钻孔</p>
                  <p className="text-xs text-slate-400 mt-0.5">查看详细信息</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Move3d className="w-4 h-4 text-primary-600" />
              操作说明
            </h3>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-start gap-2">
                <span className="text-primary-600 font-bold">⌨</span>
                <span>鼠标左键拖拽：旋转视角</span>
              </div>
              <div className="flex items-start gap-2">
                <ZoomIn className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>鼠标滚轮：放大/缩小</span>
              </div>
              <div className="flex items-start gap-2">
                <ZoomOut className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>鼠标右键拖拽：平移场景</span>
              </div>
              <div className="flex items-start gap-2">
                <Maximize2 className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>点击左上角视角按钮快速切换</span>
              </div>
            </div>
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
