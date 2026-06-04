import React, { useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Trash2,
  BarChart3,
  Settings2,
  MapPin,
  Ruler,
  Layers,
  Loader2,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { BoreholeMap } from '@/components/map/BoreholeMap';
import { SectionChart } from '@/components/chart/SectionChart';
import { sectionApi, spatialApi } from '@/utils/api';
import type { SectionLine, SectionData, Fault } from '../../shared/types';

export default function SectionAnalysis() {
  const {
    boreholes,
    lithologyDict,
    sectionData,
    loading,
    fetchBoreholes,
    fetchLithologyDict,
    setSectionData,
    setError,
  } = useAppStore();

  const [tolerance, setTolerance] = useState<number>(50);
  const [sectionLine, setSectionLine] = useState<SectionLine | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ lng: number; lat: number }[]>([]);
  const [highlightedBoreholeIds, setHighlightedBoreholeIds] = useState<string[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [showFaultPanel, setShowFaultPanel] = useState(false);
  const [showAddFault, setShowAddFault] = useState(false);
  const [newFault, setNewFault] = useState({
    name: '',
    type: 'normal' as 'normal' | 'reverse' | 'strike-slip',
    startLng: '',
    startLat: '',
    endLng: '',
    endLat: '',
    dipAngle: '60',
    throwAmount: '5',
    heaveAmount: '3',
    description: '',
  });

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

  const calculateDistance = (
    p1: { lng: number; lat: number },
    p2: { lng: number; lat: number }
  ): number => {
    const R = 6371000;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) *
        Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getBoreholeIdsNearLine = (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
    toleranceMeters: number
  ): string[] => {
    const ids: string[] = [];

    boreholes.forEach((bh) => {
      const A = bh.longitude - start.lng;
      const B = bh.latitude - start.lat;
      const C = end.lng - start.lng;
      const D = end.lat - start.lat;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = start.lng;
        yy = start.lat;
      } else if (param > 1) {
        xx = end.lng;
        yy = end.lat;
      } else {
        xx = start.lng + param * C;
        yy = start.lat + param * D;
      }

      const dx = bh.longitude - xx;
      const dy = bh.latitude - yy;
      const dist = Math.sqrt(dx * dx + dy * dy) * 111320;

      if (dist <= toleranceMeters) {
        ids.push(bh.id);
      }
    });

    return ids;
  };

  const handleStartDrawing = () => {
    setDrawMode(true);
    setDrawPoints([]);
    setSectionLine(null);
    setSectionData(null);
    setHighlightedBoreholeIds([]);
  };

  const handleMapClick = (lng: number, lat: number) => {
    if (!drawMode) return;

    const newPoints = [...drawPoints, { lng, lat }];
    setDrawPoints(newPoints);

    if (newPoints.length === 2) {
      const start = newPoints[0];
      const end = newPoints[1];
      const nearBoreholeIds = getBoreholeIdsNearLine(start, end, tolerance);

      const newSectionLine: SectionLine = {
        id: `section-${Date.now()}`,
        name: `剖面线-${new Date().toLocaleDateString()}`,
        startPoint: start,
        endPoint: end,
        boreholes: nearBoreholeIds,
        createdAt: new Date().toISOString(),
      };

      setSectionLine(newSectionLine);
      setHighlightedBoreholeIds(nearBoreholeIds);
      setDrawMode(false);
      setDrawPoints([]);
    }
  };

  const handleClear = () => {
    setSectionLine(null);
    setSectionData(null);
    setDrawMode(false);
    setDrawPoints([]);
    setHighlightedBoreholeIds([]);
  };

  const handleGenerateSection = async () => {
    if (!sectionLine) return;

    setIsGenerating(true);
    setError(null);

    try {
      const data: SectionData = await sectionApi.generate({
        startPoint: sectionLine.startPoint,
        endPoint: sectionLine.endPoint,
        tolerance,
      });
      setSectionData(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || '生成剖面失败');
      } else {
        setError('生成剖面失败');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDrawComplete = (result: { type: string; coordinates: number[][]; radius?: number }) => {
    if (result.coordinates.length >= 2) {
      const start = { lng: result.coordinates[0][0], lat: result.coordinates[0][1] };
      const end = { lng: result.coordinates[1][0], lat: result.coordinates[1][1] };
      const nearBoreholeIds = getBoreholeIdsNearLine(start, end, tolerance);

      const newSectionLine: SectionLine = {
        id: `section-${Date.now()}`,
        name: `剖面线-${new Date().toLocaleDateString()}`,
        startPoint: start,
        endPoint: end,
        boreholes: nearBoreholeIds,
        createdAt: new Date().toISOString(),
      };

      setSectionLine(newSectionLine);
      setHighlightedBoreholeIds(nearBoreholeIds);
      setDrawMode(false);
    }
  };

  const handleAddFault = async () => {
    try {
      const faultData = {
        name: newFault.name,
        type: newFault.type,
        startPoint: { lng: Number(newFault.startLng), lat: Number(newFault.startLat) },
        endPoint: { lng: Number(newFault.endLng), lat: Number(newFault.endLat) },
        dipAngle: Number(newFault.dipAngle),
        throwAmount: Number(newFault.throwAmount),
        heaveAmount: Number(newFault.heaveAmount),
        description: newFault.description,
      };
      await spatialApi.createFault(faultData);
      await loadFaults();
      setShowAddFault(false);
      setNewFault({
        name: '',
        type: 'normal',
        startLng: '',
        startLat: '',
        endLng: '',
        endLat: '',
        dipAngle: '60',
        throwAmount: '5',
        heaveAmount: '3',
        description: '',
      });
    } catch {
      setError('添加断层失败');
    }
  };

  const handleDeleteFault = async (id: string) => {
    try {
      await spatialApi.deleteFault(id);
      await loadFaults();
    } catch {
      setError('删除断层失败');
    }
  };

  const intersectingBoreholes = boreholes.filter((bh) =>
    highlightedBoreholeIds.includes(bh.id)
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">剖面分析</h1>
          <p className="mt-1 text-sm text-slate-500">
            在地图上绘制剖面线，生成地质剖面图（支持断层约束）
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <button
          onClick={handleStartDrawing}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            drawMode
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Pencil className="w-4 h-4" />
          绘制剖面线
        </button>

        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          清除
        </button>

        <button
          onClick={handleGenerateSection}
          disabled={!sectionLine || isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          生成剖面
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setShowFaultPanel(!showFaultPanel)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            showFaultPanel
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          断层管理
          {faults.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {faults.length}
            </span>
          )}
          {showFaultPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-400" />
          <label className="text-sm text-slate-600">容差:</label>
          <input
            type="number"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            min="1"
          />
          <span className="text-sm text-slate-500">米</span>
        </div>
      </div>

      {showFaultPanel && (
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-500" />
              断层管理
              <span className="text-xs text-slate-400 font-normal">（剖面穿越断层时，地层将自动断开和错动）</span>
            </h3>
            <button
              onClick={() => setShowAddFault(!showAddFault)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
            >
              <Plus className="w-3 h-3" />
              添加断层
            </button>
          </div>

          {showAddFault && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">断层名称*</label>
                  <input
                    type="text"
                    value={newFault.name}
                    onChange={(e) => setNewFault({ ...newFault, name: e.target.value })}
                    placeholder="如: F1正断层"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">断层类型*</label>
                  <select
                    value={newFault.type}
                    onChange={(e) => setNewFault({ ...newFault, type: e.target.value as 'normal' | 'reverse' | 'strike-slip' })}
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  >
                    <option value="normal">正断层（上盘下降）</option>
                    <option value="reverse">逆断层（上盘上升）</option>
                    <option value="strike-slip">走滑断层</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">倾角(°)*</label>
                  <input
                    type="number"
                    value={newFault.dipAngle}
                    onChange={(e) => setNewFault({ ...newFault, dipAngle: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                    min="0"
                    max="90"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">落差(m)*</label>
                  <input
                    type="number"
                    value={newFault.throwAmount}
                    onChange={(e) => setNewFault({ ...newFault, throwAmount: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">起点经度</label>
                  <input
                    type="number"
                    value={newFault.startLng}
                    onChange={(e) => setNewFault({ ...newFault, startLng: e.target.value })}
                    step="0.0001"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">起点纬度</label>
                  <input
                    type="number"
                    value={newFault.startLat}
                    onChange={(e) => setNewFault({ ...newFault, startLat: e.target.value })}
                    step="0.0001"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">终点经度</label>
                  <input
                    type="number"
                    value={newFault.endLng}
                    onChange={(e) => setNewFault({ ...newFault, endLng: e.target.value })}
                    step="0.0001"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">终点纬度</label>
                  <input
                    type="number"
                    value={newFault.endLat}
                    onChange={(e) => setNewFault({ ...newFault, endLat: e.target.value })}
                    step="0.0001"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">水平断距(m)</label>
                  <input
                    type="number"
                    value={newFault.heaveAmount}
                    onChange={(e) => setNewFault({ ...newFault, heaveAmount: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFault.description}
                  onChange={(e) => setNewFault({ ...newFault, description: e.target.value })}
                  placeholder="断层描述..."
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <button
                  onClick={handleAddFault}
                  disabled={!newFault.name}
                  className="px-4 py-1 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddFault(false)}
                  className="px-3 py-1 text-sm text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {faults.length > 0 ? (
            <div className="space-y-2">
              {faults.map((fault) => {
                const isNormal = fault.type === 'normal';
                const isReverse = fault.type === 'reverse';
                const typeColor = isNormal ? 'bg-red-100 text-red-700' : isReverse ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';
                const typeLabel = isNormal ? '正断层' : isReverse ? '逆断层' : '走滑';

                return (
                  <div key={fault.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeColor}`}>
                      {typeLabel}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{fault.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      倾角{fault.dipAngle}° 落差{fault.throwAmount}m
                    </span>
                    <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                      ({fault.startPoint.lng.toFixed(4)}, {fault.startPoint.lat.toFixed(4)}) → ({fault.endPoint.lng.toFixed(4)}, {fault.endPoint.lat.toFixed(4)})
                    </span>
                    {fault.description && (
                      <span className="text-xs text-slate-400 truncate max-w-[150px]">
                        {fault.description}
                      </span>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteFault(fault.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-3">
              暂无断层数据。点击"添加断层"按钮创建断层，生成剖面时将自动处理断层约束。
            </p>
          )}
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-1/2 flex flex-col gap-4">
          <BoreholeMap
            boreholes={boreholes}
            sectionLine={sectionLine}
            onDrawComplete={handleDrawComplete}
            onMapClick={handleMapClick}
            highlightedBoreholeIds={highlightedBoreholeIds}
            height={500}
            className="flex-1 min-h-0"
          />

          {sectionLine && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                剖面参数
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">起点坐标:</span>
                  <span className="ml-2 font-mono text-slate-700">
                    {sectionLine.startPoint.lng.toFixed(4)}, {sectionLine.startPoint.lat.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">终点坐标:</span>
                  <span className="ml-2 font-mono text-slate-700">
                    {sectionLine.endPoint.lng.toFixed(4)}, {sectionLine.endPoint.lat.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">剖面长度:</span>
                  <span className="ml-2 font-mono text-slate-700">
                    {calculateDistance(sectionLine.startPoint, sectionLine.endPoint).toFixed(2)} m
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">相交钻孔:</span>
                  <span className="ml-2 text-slate-700">
                    {sectionLine.boreholes.length} 个
                  </span>
                </div>
              </div>

              {sectionData && sectionData.faults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    剖面穿越断层
                  </h4>
                  <div className="space-y-1">
                    {sectionData.faults.map((fi) => (
                      <div key={fi.faultId} className="flex items-center gap-2 text-sm">
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
                          {fi.faultType === 'normal' ? '正' : fi.faultType === 'reverse' ? '逆' : '走滑'}
                        </span>
                        <span className="font-medium text-slate-700">{fi.faultName}</span>
                        <span className="text-slate-500 font-mono text-xs">
                          位置{fi.position.toFixed(1)}m 倾角{fi.dipAngle}° 落差{fi.throwAmount}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {intersectingBoreholes.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    相交钻孔列表
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {intersectingBoreholes.map((bh) => (
                      <div
                        key={bh.id}
                        className="flex items-center justify-between px-2 py-1 text-sm bg-slate-50 rounded"
                      >
                        <span className="font-medium text-slate-700">{bh.code}</span>
                        <span className="text-slate-500">
                          <Ruler className="w-3 h-3 inline mr-1" />
                          {bh.totalDepth.toFixed(1)}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-1/2 flex flex-col">
          {sectionData ? (
            <SectionChart
              sectionData={sectionData}
              lithologyDict={lithologyDict}
              width={800}
              height={600}
            />
          ) : (
            <div className="flex-1 bg-white rounded-lg border border-slate-200 flex items-center justify-center h-full">
              <div className="text-center">
                {drawMode ? (
                  <>
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pencil className="w-8 h-8 text-primary-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      {drawPoints.length === 0
                        ? '请在地图上点击起点'
                        : '请在地图上点击终点'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      已选择 {drawPoints.length} 个点
                    </p>
                  </>
                ) : sectionLine ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      剖面线已绘制完成
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      点击"生成剖面"按钮生成剖面图
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      暂无剖面数据
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      请先在左侧地图上绘制剖面线
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
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
