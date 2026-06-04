import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Borehole, SectionLine } from '../../../shared/types';

export type DrawMode = 'none' | 'point' | 'circle' | 'rectangle' | 'polygon' | 'section';

export interface DrawResult {
  type: DrawMode;
  coordinates: number[][];
  radius?: number;
}

interface BoreholeMapProps {
  boreholes: Borehole[];
  selectedBoreholeId?: string;
  highlightedBoreholeIds?: string[];
  onBoreholeClick?: (borehole: Borehole) => void;
  onMapClick?: (lng: number, lat: number) => void;
  showDrawTools?: boolean;
  drawMode?: DrawMode;
  onDrawComplete?: (result: DrawResult) => void;
  onDrawModeChange?: (mode: DrawMode) => void;
  queryGeometry?: DrawResult | null;
  sectionLine?: SectionLine | null;
  height?: number;
  className?: string;
}

const createBoreholeIcon = (depth: number, isHighlighted: boolean = false) => {
  let color = '#165DFF';
  if (depth < 20) color = '#059669';
  else if (depth < 50) color = '#165DFF';
  else if (depth < 100) color = '#D97706';
  else color = '#DC2626';

  const size = isHighlighted ? 32 : 24;
  const innerSize = isHighlighted ? 12 : 8;
  const borderColor = isHighlighted ? '#F59E0B' : 'white';
  const borderWidth = isHighlighted ? 3 : 2;
  const glowStyle = isHighlighted ? 'box-shadow: 0 0 12px rgba(245, 158, 11, 0.8), 0 2px 4px rgba(0,0,0,0.3);' : 'box-shadow: 0 2px 4px rgba(0,0,0,0.3);';

  return L.divIcon({
    className: 'borehole-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${borderWidth}px solid ${borderColor};
        border-radius: 50%;
        ${glowStyle}
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <div style="
          width: ${innerSize}px;
          height: ${innerSize}px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export const BoreholeMap: React.FC<BoreholeMapProps> = ({
  boreholes,
  selectedBoreholeId,
  highlightedBoreholeIds = [],
  onBoreholeClick,
  onMapClick,
  showDrawTools = false,
  drawMode: externalDrawMode,
  onDrawComplete,
  onDrawModeChange,
  queryGeometry,
  sectionLine,
  height = 500,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const sectionLineLayerRef = useRef<L.Polyline | null>(null);
  const queryGeometryLayerRef = useRef<L.Layer | null>(null);
  const tempGeometryRef = useRef<L.Layer | null>(null);

  const [internalDrawMode, setInternalDrawMode] = useState<DrawMode>('none');
  const [drawPoints, setDrawPoints] = useState<L.LatLng[]>([]);
  const [circleRadius, setCircleRadius] = useState<number>(0);

  const drawMode = externalDrawMode !== undefined ? externalDrawMode : internalDrawMode;
  const isControlled = externalDrawMode !== undefined;

  const setDrawMode = useCallback((mode: DrawMode) => {
    if (isControlled) {
      onDrawModeChange?.(mode);
    } else {
      setInternalDrawMode(mode);
    }
  }, [isControlled, onDrawModeChange]);

  const updateTempGeometry = useCallback((points: L.LatLng[], mode: DrawMode, radius?: number) => {
    if (!mapInstanceRef.current) return;

    if (tempGeometryRef.current) {
      tempGeometryRef.current.remove();
      tempGeometryRef.current = null;
    }

    if (points.length === 0) return;

    const style = {
      color: '#DC2626',
      weight: 3,
      fillColor: '#DC2626',
      fillOpacity: 0.2,
      dashArray: '10, 10',
    };

    if (mode === 'point' && points.length >= 1) {
      tempGeometryRef.current = L.circleMarker(points[0], {
        radius: 8,
        fillColor: '#DC2626',
        color: 'white',
        weight: 3,
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current);
    } else if (mode === 'circle' && points.length >= 1) {
      const r = radius || 100;
      tempGeometryRef.current = L.circle(points[0], {
        radius: r,
        ...style,
      }).addTo(mapInstanceRef.current);
    } else if (mode === 'rectangle' && points.length >= 2) {
      const bounds = L.latLngBounds(points[0], points[1]);
      tempGeometryRef.current = L.rectangle(bounds, style).addTo(mapInstanceRef.current);
    } else if ((mode === 'polygon' || mode === 'section') && points.length >= 2) {
      const latlngs = points.map(p => [p.lat, p.lng]) as [number, number][];
      if (mode === 'polygon' && points.length >= 3) {
        latlngs.push([points[0].lat, points[0].lng]);
        tempGeometryRef.current = L.polygon(latlngs, style).addTo(mapInstanceRef.current);
      } else {
        tempGeometryRef.current = L.polyline(latlngs, {
          color: '#DC2626',
          weight: 3,
          dashArray: '10, 10',
        }).addTo(mapInstanceRef.current);
      }
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.9042, 116.4074],
      zoom: 15,
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    map.on('click', (e) => {
      if (drawMode === 'none') {
        onMapClick?.(e.latlng.lng, e.latlng.lat);
        return;
      }

      if (drawMode === 'point') {
        const newPoints = [e.latlng];
        setDrawPoints(newPoints);
        updateTempGeometry(newPoints, drawMode);
        const result: DrawResult = {
          type: 'point',
          coordinates: [[e.latlng.lng, e.latlng.lat]],
        };
        onDrawComplete?.(result);
        setDrawMode('none');
        setDrawPoints([]);
        if (tempGeometryRef.current) {
          tempGeometryRef.current.remove();
          tempGeometryRef.current = null;
        }
        return;
      }

      if (drawMode === 'circle') {
        if (drawPoints.length === 0) {
          const newPoints = [e.latlng];
          setDrawPoints(newPoints);
          updateTempGeometry(newPoints, drawMode, 100);
        } else {
          const center = drawPoints[0];
          const radius = map.distance(center, e.latlng);
          const newPoints = [center, e.latlng];
          setDrawPoints(newPoints);
          setCircleRadius(radius);
          updateTempGeometry(newPoints, drawMode, radius);
          
          const result: DrawResult = {
            type: 'circle',
            coordinates: [[center.lng, center.lat]],
            radius: radius,
          };
          onDrawComplete?.(result);
          setDrawMode('none');
          setDrawPoints([]);
          setCircleRadius(0);
          if (tempGeometryRef.current) {
            tempGeometryRef.current.remove();
            tempGeometryRef.current = null;
          }
        }
        return;
      }

      if (drawMode === 'rectangle') {
        if (drawPoints.length === 0) {
          const newPoints = [e.latlng];
          setDrawPoints(newPoints);
        } else {
          const newPoints = [drawPoints[0], e.latlng];
          setDrawPoints(newPoints);
          updateTempGeometry(newPoints, drawMode);
          
          const result: DrawResult = {
            type: 'rectangle',
            coordinates: [
              [drawPoints[0].lng, drawPoints[0].lat],
              [e.latlng.lng, e.latlng.lat],
            ],
          };
          onDrawComplete?.(result);
          setDrawMode('none');
          setDrawPoints([]);
          if (tempGeometryRef.current) {
            tempGeometryRef.current.remove();
            tempGeometryRef.current = null;
          }
        }
        return;
      }

      if (drawMode === 'polygon' || drawMode === 'section') {
        const newPoints = [...drawPoints, e.latlng];
        setDrawPoints(newPoints);
        updateTempGeometry(newPoints, drawMode);
      }
    });

    map.on('mousemove', (e) => {
      if (drawMode === 'rectangle' && drawPoints.length === 1) {
        updateTempGeometry([drawPoints[0], e.latlng], drawMode);
      }
      if (drawMode === 'circle' && drawPoints.length === 1) {
        const radius = map.distance(drawPoints[0], e.latlng);
        updateTempGeometry([drawPoints[0], e.latlng], drawMode, radius);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [drawMode, drawPoints, onMapClick, onDrawComplete, setDrawMode, updateTempGeometry]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    boreholes.forEach(borehole => {
      const isHighlighted = highlightedBoreholeIds.includes(borehole.id);
      const isSelected = borehole.id === selectedBoreholeId;
      
      const marker = L.marker(
        [borehole.latitude, borehole.longitude],
        { icon: createBoreholeIcon(borehole.totalDepth, isHighlighted || isSelected) }
      );

      marker.addTo(mapInstanceRef.current!);

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">${borehole.code} ${borehole.name || ''}</h3>
          <p class="text-xs text-slate-600 mt-1">孔口高程: ${borehole.elevation.toFixed(2)}m</p>
          <p class="text-xs text-slate-600">总深度: ${borehole.totalDepth.toFixed(2)}m</p>
          <p class="text-xs text-slate-600">地层数: ${borehole.layers.length}层</p>
          <button onclick="window.dispatchEvent(new CustomEvent('borehole-click', {detail: '${borehole.id}'}))" 
            class="mt-2 px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 w-full">
            查看详情
          </button>
        </div>
      `);

      marker.on('click', () => {
        onBoreholeClick?.(borehole);
      });

      markersRef.current.push(marker);
    });

    if (boreholes.length > 0 && !selectedBoreholeId) {
      const bounds = L.latLngBounds(
        boreholes.map(b => [b.latitude, b.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boreholes, selectedBoreholeId, highlightedBoreholeIds, onBoreholeClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (sectionLineLayerRef.current) {
      sectionLineLayerRef.current.remove();
      sectionLineLayerRef.current = null;
    }

    if (sectionLine) {
      const latlngs: [number, number][] = [
        [sectionLine.startPoint.lat, sectionLine.startPoint.lng],
        [sectionLine.endPoint.lat, sectionLine.endPoint.lng],
      ];

      sectionLineLayerRef.current = L.polyline(latlngs, {
        color: '#DC2626',
        weight: 3,
        dashArray: '15, 10',
      }).addTo(mapInstanceRef.current);

      const startMarker = L.circleMarker(latlngs[0], {
        radius: 8,
        fillColor: '#DC2626',
        color: 'white',
        weight: 2,
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current);
      startMarker.bindPopup('起点');

      const endMarker = L.circleMarker(latlngs[1], {
        radius: 8,
        fillColor: '#DC2626',
        color: 'white',
        weight: 2,
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current);
      endMarker.bindPopup('终点');

      markersRef.current.push(startMarker as unknown as L.Marker, endMarker as unknown as L.Marker);
    }
  }, [sectionLine]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (queryGeometryLayerRef.current) {
      queryGeometryLayerRef.current.remove();
      queryGeometryLayerRef.current = null;
    }

    if (!queryGeometry) return;

    const style = {
      color: '#165DFF',
      weight: 3,
      fillColor: '#165DFF',
      fillOpacity: 0.15,
    };

    if (queryGeometry.type === 'point' && queryGeometry.coordinates.length > 0) {
      const [lng, lat] = queryGeometry.coordinates[0];
      queryGeometryLayerRef.current = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#165DFF',
        color: 'white',
        weight: 3,
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current);
    } else if (queryGeometry.type === 'circle' && queryGeometry.coordinates.length > 0) {
      const [lng, lat] = queryGeometry.coordinates[0];
      queryGeometryLayerRef.current = L.circle([lat, lng], {
        radius: queryGeometry.radius || 100,
        ...style,
      }).addTo(mapInstanceRef.current);
    } else if (queryGeometry.type === 'rectangle' && queryGeometry.coordinates.length >= 2) {
      const [[lng1, lat1], [lng2, lat2]] = queryGeometry.coordinates;
      const bounds = L.latLngBounds([lat1, lng1], [lat2, lng2]);
      queryGeometryLayerRef.current = L.rectangle(bounds, style).addTo(mapInstanceRef.current);
    } else if (queryGeometry.type === 'polygon' && queryGeometry.coordinates.length >= 3) {
      const latlngs = queryGeometry.coordinates.map(([lng, lat]) => [lat, lng]) as [number, number][];
      queryGeometryLayerRef.current = L.polygon(latlngs, style).addTo(mapInstanceRef.current);
    }
  }, [queryGeometry]);

  useEffect(() => {
    const handleBoreholeClick = (e: CustomEvent) => {
      const borehole = boreholes.find(b => b.id === e.detail);
      if (borehole) {
        onBoreholeClick?.(borehole);
      }
    };

    window.addEventListener('borehole-click', handleBoreholeClick as EventListener);
    return () => {
      window.removeEventListener('borehole-click', handleBoreholeClick as EventListener);
    };
  }, [boreholes, onBoreholeClick]);

  const handleClearDrawing = useCallback(() => {
    setDrawMode('none');
    setDrawPoints([]);
    setCircleRadius(0);
    if (tempGeometryRef.current) {
      tempGeometryRef.current.remove();
      tempGeometryRef.current = null;
    }
  }, [setDrawMode]);

  const handleFinishDrawing = useCallback(() => {
    if (drawPoints.length >= 2) {
      const coordinates = drawPoints.map(p => [p.lng, p.lat]);
      const result: DrawResult = {
        type: drawMode as DrawMode,
        coordinates,
        radius: circleRadius > 0 ? circleRadius : undefined,
      };
      onDrawComplete?.(result);
    }
    handleClearDrawing();
  }, [drawPoints, drawMode, circleRadius, onDrawComplete, handleClearDrawing]);

  const handleUndoPoint = useCallback(() => {
    if (drawPoints.length > 0) {
      const newPoints = drawPoints.slice(0, -1);
      setDrawPoints(newPoints);
      updateTempGeometry(newPoints, drawMode, circleRadius);
    }
  }, [drawPoints, drawMode, circleRadius, updateTempGeometry]);

  const handleSetDrawMode = useCallback((mode: DrawMode) => {
    handleClearDrawing();
    setDrawMode(mode);
  }, [handleClearDrawing, setDrawMode]);

  const drawTools = [
    { mode: 'point' as const, label: '点查询', icon: '📍' },
    { mode: 'circle' as const, label: '圆查询', icon: '⭕' },
    { mode: 'rectangle' as const, label: '矩形查询', icon: '⬜' },
    { mode: 'polygon' as const, label: '多边形查询', icon: '🔷' },
    { mode: 'section' as const, label: '剖面线', icon: '📏' },
  ];

  const getDrawModeHint = () => {
    switch (drawMode) {
      case 'point': return '点击地图选择查询点';
      case 'circle': return drawPoints.length === 0 ? '点击地图设置圆心' : '移动鼠标确定半径，点击完成';
      case 'rectangle': return drawPoints.length === 0 ? '点击地图设置第一个角点' : '移动鼠标确定范围，点击完成';
      case 'polygon': return '点击地图添加顶点，点击"完成"结束绘制';
      case 'section': return '点击地图添加顶点，点击"完成"结束绘制';
      default: return '';
    }
  };

  const canFinish = (drawMode === 'polygon' || drawMode === 'section') && drawPoints.length >= 2;

  return (
    <div className={`relative ${className}`}>
      {showDrawTools && (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2 max-w-[320px]">
          <div className="flex flex-wrap gap-2">
            {drawTools.map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => handleSetDrawMode(mode)}
                className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                  drawMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          {drawMode !== 'none' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-600 flex-1">
                {getDrawModeHint()}
              </span>
              {(drawMode === 'polygon' || drawMode === 'section') && (
                <>
                  <button
                    onClick={handleUndoPoint}
                    disabled={drawPoints.length === 0}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    撤销
                  </button>
                  <button
                    onClick={handleFinishDrawing}
                    disabled={!canFinish}
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    完成
                  </button>
                </>
              )}
              <button
                onClick={handleClearDrawing}
                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
              >
                取消
              </button>
            </div>
          )}
          {(drawMode === 'polygon' || drawMode === 'section') && drawPoints.length > 0 && (
            <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
              已选择 {drawPoints.length} 个点
            </div>
          )}
        </div>
      )}

      <div ref={mapRef} style={{ height }} className="rounded-lg border border-slate-200" />

      <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <p className="text-xs font-semibold text-slate-700 mb-2">图例</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white"></div>
            <span className="text-xs text-slate-600">{'< 20m 浅孔'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary-600 border-2 border-white"></div>
            <span className="text-xs text-slate-600">20-50m 中深孔</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-600 border-2 border-white"></div>
            <span className="text-xs text-slate-600">50-100m 深孔</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white"></div>
            <span className="text-xs text-slate-600">{'≥ 100m 特深孔'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoreholeMap;
