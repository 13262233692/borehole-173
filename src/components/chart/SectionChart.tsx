import React, { useRef, useMemo, useCallback } from 'react';
import type { SectionData, LithologyDict, FaultIntersection } from '../../../shared/types';
import { getAllPatterns } from '@/utils/patterns';

interface SectionChartProps {
  sectionData: SectionData;
  lithologyDict: LithologyDict[];
  width?: number;
  height?: number;
  horizontalScale?: number;
  verticalScale?: number;
}

interface LayerFillSegment {
  topPoints: { x: number; y: number }[];
  bottomPoints: { x: number; y: number }[];
  lithologyCode: string;
  startIdx: number;
  endIdx: number;
  offset: number;
}

export const SectionChart: React.FC<SectionChartProps> = ({
  sectionData,
  lithologyDict,
  width = 1200,
  height = 700,
  horizontalScale = 500,
  verticalScale = 200,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { boreholes, boreholePositions, sectionLength, minElevation, maxElevation, faults } = sectionData;

  const elevRange = maxElevation - minElevation;

  const xScale = useCallback((position: number) => {
    return padding.left + (position / sectionLength) * chartWidth;
  }, [sectionLength, chartWidth, padding.left]);

  const yScale = useCallback((elevation: number, offset: number = 0) => {
    return padding.top + chartHeight - ((elevation - minElevation + offset) / elevRange) * chartHeight;
  }, [minElevation, elevRange, chartHeight, padding.top]);

  const getLithologyInfo = useCallback((code: string) => {
    return lithologyDict.find(l => l.code === code) || {
      code,
      name: code,
      color: '#808080',
      pattern: 'dots',
      category: '',
      description: '',
    };
  }, [lithologyDict]);

  const usedLithologies = useMemo(() => {
    const codes = new Set<string>();
    boreholes.forEach(bh => bh.layers.forEach(l => codes.add(l.lithologyCode)));
    return Array.from(codes).map(code => getLithologyInfo(code));
  }, [boreholes, getLithologyInfo]);

  const getFaultOffset = useCallback((position: number): number => {
    let totalOffset = 0;
    for (const fault of faults) {
      if (position > fault.position) {
        if (fault.faultType === 'normal') {
          totalOffset -= fault.throwAmount;
        } else if (fault.faultType === 'reverse') {
          totalOffset += fault.throwAmount;
        }
      }
    }
    return totalOffset;
  }, [faults]);

  const findOwningFault = useCallback((position: number): FaultIntersection | null => {
    for (const fault of faults) {
      if (Math.abs(position - fault.position) < 1) {
        return fault;
      }
    }
    return null;
  }, [faults]);

  const renderGrid = () => {
    const grid: React.ReactNode[] = [];
    const xInterval = sectionLength > 1000 ? 200 : 100;
    const yInterval = elevRange > 50 ? 20 : 10;

    for (let x = 0; x <= sectionLength; x += xInterval) {
      const px = xScale(x);
      grid.push(
        <g key={`x-${x}`}>
          <line
            x1={px}
            y1={padding.top}
            x2={px}
            y2={padding.top + chartHeight}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray="4,2"
          />
          <text
            x={px}
            y={padding.top + chartHeight + 20}
            textAnchor="middle"
            className="text-xs fill-slate-500 font-mono"
          >
            {x.toFixed(0)}
          </text>
        </g>
      );
    }

    for (let y = minElevation; y <= maxElevation; y += yInterval) {
      const py = yScale(y);
      grid.push(
        <g key={`y-${y}`}>
          <line
            x1={padding.left}
            y1={py}
            x2={padding.left + chartWidth}
            y2={py}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray="4,2"
          />
          <text
            x={padding.left - 10}
            y={py + 4}
            textAnchor="end"
            className="text-xs fill-slate-500 font-mono"
          >
            {y.toFixed(0)}
          </text>
        </g>
      );
    }

    return grid;
  };

  const renderFaults = () => {
    if (faults.length === 0) return null;

    return faults.map((fault) => {
      const fx = xScale(fault.position);
      const yTop = yScale(fault.topElevation);
      const yBot = yScale(fault.bottomElevation);

      const dipRad = (fault.dipAngle * Math.PI) / 180;
      const horizontalShift = (fault.topElevation - fault.bottomElevation) / Math.tan(dipRad);
      const shiftPx = (horizontalShift / sectionLength) * chartWidth;

      const isNormal = fault.faultType === 'normal';
      const isReverse = fault.faultType === 'reverse';

      const faultColor = isNormal ? '#DC2626' : isReverse ? '#7C3AED' : '#059669';

      return (
        <g key={`fault-${fault.faultId}`}>
          <line
            x1={fx + shiftPx / 2}
            y1={yTop}
            x2={fx - shiftPx / 2}
            y2={yBot}
            stroke={faultColor}
            strokeWidth="2.5"
            strokeDasharray="8,4"
          />

          <g transform={`translate(${fx}, ${yTop - 8})`}>
            <rect
              x={-40}
              y={-12}
              width={80}
              height={16}
              fill={faultColor}
              rx={3}
              opacity={0.9}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              className="text-xs font-bold"
              fill="white"
            >
              {fault.faultName}
            </text>
          </g>

          <text
            x={fx + shiftPx / 2 + 8}
            y={yTop + 25}
            textAnchor="start"
            className="text-xs fill-slate-600"
          >
            {isNormal ? '正断层' : isReverse ? '逆断层' : '走滑断层'}
          </text>
          <text
            x={fx + shiftPx / 2 + 8}
            y={yTop + 40}
            textAnchor="start"
            className="text-xs fill-slate-500 font-mono"
          >
            倾角{fault.dipAngle}° 落差{fault.throwAmount}m
          </text>

          {isNormal && (
            <g transform={`translate(${fx - 5}, ${yTop + (yBot - yTop) * 0.3})`}>
              <line x1={0} y1={0} x2={-12} y2={-8} stroke={faultColor} strokeWidth="1.5" />
              <line x1={0} y1={0} x2={-12} y2={8} stroke={faultColor} strokeWidth="1.5" />
              <text x={-16} y={4} textAnchor="end" className="text-xs fill-red-600">下盘</text>
            </g>
          )}
          {isNormal && (
            <g transform={`translate(${fx + shiftPx / 2 + 5}, ${yTop + (yBot - yTop) * 0.3})`}>
              <text x={0} y={4} textAnchor="start" className="text-xs fill-red-600">上盘↓</text>
            </g>
          )}
          {isReverse && (
            <g transform={`translate(${fx + shiftPx / 2 + 5}, ${yTop + (yBot - yTop) * 0.3})`}>
              <text x={0} y={4} textAnchor="start" className="text-xs fill-purple-600">上盘↑</text>
            </g>
          )}
        </g>
      );
    });
  };

  const renderBoreholes = () => {
    return boreholePositions.map(({ boreholeId, position }) => {
      const bh = boreholes.find(b => b.id === boreholeId)!;
      const x = xScale(position);
      const offset = getFaultOffset(position);
      const fault = findOwningFault(position);
      const isOnFault = fault !== null;

      return (
        <g key={bh.id}>
          <line
            x1={x}
            y1={yScale(bh.elevation, offset)}
            x2={x}
            y2={yScale(bh.elevation - bh.totalDepth, offset)}
            stroke={isOnFault ? '#F59E0B' : '#165DFF'}
            strokeWidth={isOnFault ? 3 : 2}
            strokeDasharray={isOnFault ? '4,2' : 'none'}
          />

          {bh.layers.map((layer) => {
            const lithology = getLithologyInfo(layer.lithologyCode);
            const yTop = yScale(bh.elevation - layer.depthFrom, offset);
            const yBot = yScale(bh.elevation - layer.depthTo, offset);

            return (
              <rect
                key={layer.id}
                x={x - 8}
                y={yTop}
                width={16}
                height={yBot - yTop}
                fill={lithology.color}
                stroke="#333"
                strokeWidth="0.5"
              />
            );
          })}

          <text
            x={x}
            y={yScale(bh.elevation, offset) + 15}
            textAnchor="middle"
            className="text-sm font-semibold fill-slate-700"
          >
            {bh.code}
          </text>
          <text
            x={x + 12}
            y={yScale(bh.elevation, offset) + 4}
            textAnchor="start"
            className="text-xs fill-slate-500 font-mono"
          >
            {bh.elevation.toFixed(1)}m
          </text>
          <text
            x={x + 12}
            y={yScale(bh.elevation - bh.totalDepth, offset) + 12}
            textAnchor="start"
            className="text-xs fill-slate-500 font-mono"
          >
            {bh.totalDepth.toFixed(1)}m
          </text>
        </g>
      );
    });
  };

  const computeStratumSegments = useCallback((): LayerFillSegment[] => {
    const maxLayers = Math.max(...boreholes.map(bh => bh.layers.length));
    const segments: LayerFillSegment[] = [];

    const sortedPositions = [...boreholePositions].sort((a, b) => a.position - b.position);

    for (let layerIdx = 0; layerIdx < maxLayers; layerIdx++) {
      const topPoints: { x: number; y: number; boreholeIdx: number }[] = [];
      const bottomPoints: { x: number; y: number; boreholeIdx: number }[] = [];

      sortedPositions.forEach((bp, bhIdx) => {
        const bh = boreholes.find(b => b.id === bp.boreholeId)!;
        if (bh.layers[layerIdx]) {
          const layer = bh.layers[layerIdx];
          const offset = getFaultOffset(bp.position);
          const x = xScale(bp.position);
          const yTop = yScale(bh.elevation - layer.depthFrom, offset);
          const yBot = yScale(bh.elevation - layer.depthTo, offset);

          topPoints.push({ x, y: yTop, boreholeIdx: bhIdx });
          bottomPoints.push({ x, y: yBot, boreholeIdx: bhIdx });
        }
      });

      if (topPoints.length < 2) continue;

      const faultPositions = faults.map(f => f.position);
      const breakIndices: number[] = [];

      for (let i = 0; i < sortedPositions.length - 1; i++) {
        const posA = sortedPositions[i].position;
        const posB = sortedPositions[i + 1].position;

        for (const faultPos of faultPositions) {
          if (faultPos > posA && faultPos < posB) {
            breakIndices.push(i);
            break;
          }
        }
      }

      if (breakIndices.length === 0) {
        const lithologyCode = boreholes.find(b => b.id === sortedPositions[0].boreholeId)?.layers[layerIdx]?.lithologyCode || '';
        segments.push({
          topPoints,
          bottomPoints,
          lithologyCode,
          startIdx: 0,
          endIdx: topPoints.length - 1,
          offset: 0,
        });
      } else {
        const allBreaks = [...breakIndices].sort((a, b) => a - b);
        let segStart = 0;

        for (let b = 0; b <= allBreaks.length; b++) {
          const segEnd = b < allBreaks.length ? allBreaks[b] + 1 : topPoints.length - 1;

          if (segEnd > segStart) {
            const segTopPoints = topPoints.slice(segStart, segEnd + 1);
            const segBottomPoints = bottomPoints.slice(segStart, segEnd + 1);
            const midIdx = Math.floor((segStart + segEnd) / 2);
            const midBh = boreholes.find(bh => bh.id === sortedPositions[midIdx]?.boreholeId);
            const lithologyCode = midBh?.layers[layerIdx]?.lithologyCode || '';

            const midPos = sortedPositions[midIdx]?.position || 0;
            const segOffset = getFaultOffset(midPos);

            segments.push({
              topPoints: segTopPoints,
              bottomPoints: segBottomPoints,
              lithologyCode,
              startIdx: segStart,
              endIdx: segEnd,
              offset: segOffset,
            });
          }

          segStart = b < allBreaks.length ? allBreaks[b] + 1 : segEnd;
        }
      }
    }

    return segments;
  }, [boreholes, boreholePositions, faults, getFaultOffset, xScale, yScale]);

  const stratumSegments = useMemo(() => computeStratumSegments(), [computeStratumSegments]);

  const renderStratumLines = () => {
    const elements: React.ReactNode[] = [];

    stratumSegments.forEach((segment, segIdx) => {
      const { topPoints, bottomPoints, lithologyCode } = segment;
      if (topPoints.length < 2) return;

      const lithology = getLithologyInfo(lithologyCode);

      for (let i = 0; i < topPoints.length - 1; i++) {
        elements.push(
          <line
            key={`top-${segIdx}-${i}`}
            x1={topPoints[i].x}
            y1={topPoints[i].y}
            x2={topPoints[i + 1].x}
            y2={topPoints[i + 1].y}
            stroke="#8B4513"
            strokeWidth="1.5"
          />
        );
        elements.push(
          <line
            key={`bot-${segIdx}-${i}`}
            x1={bottomPoints[i].x}
            y1={bottomPoints[i].y}
            x2={bottomPoints[i + 1].x}
            y2={bottomPoints[i + 1].y}
            stroke="#8B4513"
            strokeWidth="1"
            strokeDasharray="5,3"
          />
        );
      }

      const topPath = topPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ');

      const bottomPath = bottomPoints.slice().reverse().map((p, i) =>
        `${i === 0 ? 'L' : 'L'} ${p.x} ${p.y}`
      ).join(' ');

      const fillPath = `${topPath} ${bottomPath} Z`;

      elements.push(
        <path
          key={`fill-${segIdx}`}
          d={fillPath}
          fill={lithology.color}
          fillOpacity="0.4"
          stroke="none"
        />
      );

      elements.push(
        <path
          key={`pattern-${segIdx}`}
          d={fillPath}
          fill={`url(#pattern-${lithology.pattern})`}
          style={{ color: 'rgba(0,0,0,0.2)' }}
          stroke="none"
        />
      );
    });

    return elements;
  };

  const renderFaultLegend = () => {
    if (faults.length === 0) return null;

    const legendWidth = 180;
    const itemHeight = 22;
    const legendX = width - padding.right - legendWidth;
    const lithoLegendHeight = usedLithologies.length * itemHeight + 35;
    const legendY = padding.top + lithoLegendHeight + 10;

    return (
      <g transform={`translate(${legendX}, ${legendY})`}>
        <rect
          x="0"
          y="0"
          width={legendWidth}
          height={faults.length * itemHeight + 35}
          fill="white"
          stroke="#e2e8f0"
          rx="4"
        />
        <text x="10" y="22" className="text-sm font-semibold fill-slate-700">
          断层
        </text>
        {faults.map((fault, index) => {
          const isNormal = fault.faultType === 'normal';
          const isReverse = fault.faultType === 'reverse';
          const color = isNormal ? '#DC2626' : isReverse ? '#7C3AED' : '#059669';
          return (
            <g key={fault.faultId} transform={`translate(10, ${40 + index * itemHeight})`}>
              <line
                x1={0}
                y1={8}
                x2={16}
                y2={8}
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray="4,2"
              />
              <text x="22" y="12" className="text-xs fill-slate-600">
                {fault.faultName} ({isNormal ? '正' : isReverse ? '逆' : '走滑'})
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderLegend = () => {
    const legendWidth = 180;
    const itemHeight = 22;
    const legendX = width - padding.right - legendWidth;
    const legendY = padding.top;

    return (
      <g transform={`translate(${legendX}, ${legendY})`}>
        <rect
          x="0"
          y="0"
          width={legendWidth}
          height={usedLithologies.length * itemHeight + 35}
          fill="white"
          stroke="#e2e8f0"
          rx="4"
        />
        <text x="10" y="22" className="text-sm font-semibold fill-slate-700">
          图例
        </text>
        {usedLithologies.map((litho, index) => (
          <g key={litho.code} transform={`translate(10, ${40 + index * itemHeight})`}>
            <rect
              width="16"
              height="16"
              fill={litho.color}
              stroke="#333"
              strokeWidth="0.5"
            />
            <rect
              width="16"
              height="16"
              fill={`url(#pattern-${litho.pattern})`}
              style={{ color: 'rgba(0,0,0,0.3)' }}
            />
            <text x="25" y="12" className="text-xs fill-slate-600">
              {litho.code} - {litho.name}
            </text>
          </g>
        ))}
      </g>
    );
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `剖面图_${new Date().toISOString().slice(0, 10)}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `剖面图_${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };

    img.src = url;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600">
          <span className="font-medium">剖面长度:</span> {sectionLength.toFixed(0)}m | 
          <span className="font-medium ml-2">钻孔数量:</span> {boreholes.length} | 
          <span className="font-medium ml-2">高程范围:</span> {minElevation.toFixed(0)}m ~ {maxElevation.toFixed(0)}m
          {faults.length > 0 && (
            <>
              <span className="mx-2">|</span>
              <span className="font-medium">断层:</span> {faults.length}条
              {faults.map(f => ` (${f.faultName}, 落差${f.throwAmount}m)`).join('')}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportSVG}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
          >
            导出SVG
          </button>
          <button
            onClick={handleExportPNG}
            className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
          >
            导出PNG
          </button>
        </div>
      </div>
      <div className="overflow-auto border border-slate-200 rounded-lg bg-white p-4">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="bg-white"
        >
          <defs dangerouslySetInnerHTML={{ __html: getAllPatterns() }} />

          <text
            x={width / 2}
            y={25}
            textAnchor="middle"
            className="text-lg font-bold fill-slate-800"
          >
            工程地质剖面图
            {faults.length > 0 && '（含断层）'}
          </text>

          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + chartWidth}
            y2={padding.top}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <line
            x1={padding.left + chartWidth}
            y1={padding.top}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1"
          />

          <text
            x={padding.left + chartWidth / 2}
            y={height - 25}
            textAnchor="middle"
            className="text-sm font-medium fill-slate-600"
          >
            水平距离 (m) · 水平比例尺 1:{horizontalScale}
          </text>
          <text
            x={25}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 25, ${height / 2})`}
            className="text-sm font-medium fill-slate-600"
          >
            高程 (m) · 垂直比例尺 1:{verticalScale}
          </text>

          {renderGrid()}
          {renderStratumLines()}
          {renderBoreholes()}
          {renderFaults()}
          {renderLegend()}
          {renderFaultLegend()}
        </svg>
      </div>
    </div>
  );
};

export default SectionChart;
