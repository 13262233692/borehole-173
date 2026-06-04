import React, { useRef, useMemo, useCallback } from 'react';
import type { Borehole, StratumLayer, LithologyDict } from '../../../shared/types';
import { getAllPatterns } from '@/utils/patterns';

interface BoreholeChartProps {
  borehole: Borehole;
  lithologyDict: LithologyDict[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  scale?: number;
  onExport?: () => void;
}

export const BoreholeChart: React.FC<BoreholeChartProps> = ({
  borehole,
  lithologyDict,
  width = 800,
  height = 900,
  showLegend = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = { top: 60, right: 180, bottom: 40, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const columnWidth = 80;
  const columnGap = 40;

  const { layers, totalDepth, elevation, code, name } = borehole;

  const maxDepth = useMemo(() => {
    return Math.max(totalDepth, ...layers.map(l => l.depthTo)) || 10;
  }, [totalDepth, layers]);

  const verticalScale = chartHeight / maxDepth;

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
    const codes = new Set(layers.map(l => l.lithologyCode));
    return Array.from(codes).map(code => getLithologyInfo(code));
  }, [layers, getLithologyInfo]);

  const renderLayer = (layer: StratumLayer, x: number) => {
    const lithology = getLithologyInfo(layer.lithologyCode);
    const y = padding.top + layer.depthFrom * verticalScale;
    const layerHeight = (layer.depthTo - layer.depthFrom) * verticalScale;

    return (
      <g key={layer.id}>
        <rect
          x={x}
          y={y}
          width={columnWidth}
          height={layerHeight}
          fill={lithology.color}
          stroke="#333"
          strokeWidth="1"
          className="transition-all duration-200 hover:opacity-80"
        />
        <rect
          x={x}
          y={y}
          width={columnWidth}
          height={layerHeight}
          fill={`url(#pattern-${lithology.pattern})`}
          stroke="none"
          style={{ color: 'rgba(0,0,0,0.3)' }}
        />
      </g>
    );
  };

  const renderDepthScale = () => {
    const ticks: React.ReactNode[] = [];
    const interval = maxDepth > 50 ? 10 : maxDepth > 20 ? 5 : 2;

    for (let depth = 0; depth <= maxDepth; depth += interval) {
      const y = padding.top + depth * verticalScale;
      ticks.push(
        <g key={depth}>
          <line
            x1={padding.left - 10}
            y1={y}
            x2={padding.left + chartWidth + 10}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray="4,2"
          />
          <text
            x={padding.left - 15}
            y={y + 4}
            textAnchor="end"
            className="text-xs fill-slate-500 font-mono"
          >
            {depth.toFixed(0)}
          </text>
        </g>
      );
    }
    return ticks;
  };

  const renderElevationScale = () => {
    const ticks: React.ReactNode[] = [];
    const interval = maxDepth > 50 ? 10 : maxDepth > 20 ? 5 : 2;

    for (let depth = 0; depth <= maxDepth; depth += interval) {
      const y = padding.top + depth * verticalScale;
      const elev = elevation - depth;
      ticks.push(
        <text
          key={depth}
          x={padding.left + columnWidth + 15}
          y={y + 4}
          textAnchor="start"
          className="text-xs fill-slate-500 font-mono"
        >
          {elev.toFixed(1)}
        </text>
      );
    }
    return ticks;
  };

  const renderLayerLabels = () => {
    return layers.map((layer) => {
      const lithology = getLithologyInfo(layer.lithologyCode);
      const y1 = padding.top + layer.depthFrom * verticalScale;
      const y2 = padding.top + layer.depthTo * verticalScale;
      const midY = (y1 + y2) / 2;

      return (
        <g key={layer.id}>
          <text
            x={padding.left + columnWidth + columnGap}
            y={midY + 4}
            textAnchor="start"
            className="text-xs fill-slate-700"
          >
            {layer.layerIndex}
          </text>
          <text
            x={padding.left + columnWidth + columnGap + 25}
            y={midY + 4}
            textAnchor="start"
            className="text-xs fill-slate-700"
          >
            {layer.thickness.toFixed(2)}
          </text>
          <text
            x={padding.left + columnWidth + columnGap + 70}
            y={midY + 4}
            textAnchor="start"
            className="text-xs fill-slate-700"
            style={{ color: lithology.color }}
          >
            {layer.lithologyName}
          </text>
        </g>
      );
    });
  };

  const renderLegend = () => {
    if (!showLegend) return null;

    return (
      <g transform={`translate(${padding.left + chartWidth - 150}, ${padding.top})`}>
        <rect x="0" y="0" width="150" height={usedLithologies.length * 25 + 30} fill="white" stroke="#e2e8f0" rx="4" />
        <text x="10" y="20" className="text-sm font-semibold fill-slate-700">图例</text>
        {usedLithologies.map((litho, index) => (
          <g key={litho.code} transform={`translate(10, ${40 + index * 25})`}>
            <rect width="16" height="16" fill={litho.color} stroke="#333" strokeWidth="0.5" />
            <rect width="16" height="16" fill={`url(#pattern-${litho.pattern})`} style={{ color: 'rgba(0,0,0,0.3)' }} />
            <text x="25" y="12" className="text-xs fill-slate-600">
              {litho.code} - {litho.name}
            </text>
          </g>
        ))}
      </g>
    );
  };

  const getSVGContent = () => {
    return (
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
          钻孔柱状图 - {code} {name}
        </text>

        <g>
          <text
            x={padding.left - 15}
            y={padding.top - 20}
            textAnchor="end"
            className="text-sm font-medium fill-slate-600"
          >
            深度(m)
          </text>
          <text
            x={padding.left + columnWidth + 15}
            y={padding.top - 20}
            textAnchor="start"
            className="text-sm font-medium fill-slate-600"
          >
            高程(m)
          </text>
          <text
            x={padding.left + columnWidth + columnGap}
            y={padding.top - 20}
            textAnchor="start"
            className="text-sm font-medium fill-slate-600"
          >
            层号
          </text>
          <text
            x={padding.left + columnWidth + columnGap + 25}
            y={padding.top - 20}
            textAnchor="start"
            className="text-sm font-medium fill-slate-600"
          >
            厚度
          </text>
          <text
            x={padding.left + columnWidth + columnGap + 70}
            y={padding.top - 20}
            textAnchor="start"
            className="text-sm font-medium fill-slate-600"
          >
            岩性
          </text>
        </g>

        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        <line
          x1={padding.left + columnWidth}
          y1={padding.top}
          x2={padding.left + columnWidth}
          y2={padding.top + chartHeight}
          stroke="#94a3b8"
          strokeWidth="1"
        />

        {renderDepthScale()}
        {renderElevationScale()}

        {layers.map(layer => renderLayer(layer, padding.left))}

        {renderLayerLabels()}

        <line
          x1={padding.left}
          y1={padding.top + chartHeight + 5}
          x2={padding.left + columnWidth}
          y2={padding.top + chartHeight + 5}
          stroke="#333"
          strokeWidth="2"
        />
        <text
          x={padding.left + columnWidth / 2}
          y={padding.top + chartHeight + 25}
          textAnchor="middle"
          className="text-xs fill-slate-500"
        >
          孔口高程: {elevation.toFixed(2)}m | 总深度: {totalDepth.toFixed(2)}m
        </text>

        {renderLegend()}
      </svg>
    );
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `柱状图_${borehole.code}.svg`;
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
        link.download = `柱状图_${borehole.code}.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };

    img.src = url;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
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
      <div className="overflow-auto border border-slate-200 rounded-lg bg-white p-4">
        {getSVGContent()}
      </div>
    </div>
  );
};

export default BoreholeChart;
