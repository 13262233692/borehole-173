import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { Borehole, LithologyDict, Fault } from '../../../shared/types';

interface Borehole3DViewerProps {
  boreholes: Borehole[];
  lithologyDict: LithologyDict[];
  faults?: Fault[];
  onBoreholeSelect?: (borehole: Borehole | null) => void;
  selectedBoreholeId?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  showLabels?: boolean;
  verticalExaggeration?: number;
}

interface ViewMode {
  position: [number, number, number];
  target: [number, number, number];
}

const VIEW_MODES: Record<string, ViewMode> = {
  isometric: { position: [200, 200, 200], target: [0, 0, 0] },
  top: { position: [0, 500, 0], target: [0, 0, 0] },
  front: { position: [0, 0, 300], target: [0, 0, 0] },
  side: { position: [300, 0, 0], target: [0, 0, 0] },
};

const Borehole3D: React.FC<{
  borehole: Borehole;
  position: [number, number, number];
  lithologyDict: LithologyDict[];
  verticalExaggeration: number;
  isSelected: boolean;
  onClick: () => void;
  showLabel?: boolean;
}> = ({ borehole, position, lithologyDict, verticalExaggeration, isSelected, onClick, showLabel = true }) => {
  const [hovered, setHovered] = useState(false);
  const cylinderRef = useRef<THREE.Group>(null);

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

  const layers = useMemo(() => {
    const result: {
      y: number;
      height: number;
      color: string;
      lithologyCode: string;
      lithologyName: string;
      depthFrom: number;
      depthTo: number;
    }[] = [];

    let cumulativeDepth = 0;
    for (const layer of borehole.layers) {
      const lithology = getLithologyInfo(layer.lithologyCode);
      const height = layer.thickness * verticalExaggeration;
      result.push({
        y: -cumulativeDepth * verticalExaggeration - height / 2,
        height,
        color: lithology.color,
        lithologyCode: layer.lithologyCode,
        lithologyName: lithology.name,
        depthFrom: layer.depthFrom,
        depthTo: layer.depthTo,
      });
      cumulativeDepth += layer.thickness;
    }

    return result;
  }, [borehole, verticalExaggeration, getLithologyInfo]);

  const radius = isSelected ? 4 : hovered ? 3.5 : 3;
  const boreholeDepth = borehole.totalDepth * verticalExaggeration;

  return (
    <group
      position={position}
      ref={cylinderRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {layers.map((layer, index) => (
        <mesh key={index} position={[0, layer.y, 0]}>
          <cylinderGeometry args={[radius, radius, layer.height, 12]} />
          <meshStandardMaterial
            color={layer.color}
            roughness={0.7}
            metalness={0.1}
            emissive={isSelected ? layer.color : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        </mesh>
      ))}

      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[radius + 0.5, radius + 0.5, 1, 12]} />
        <meshStandardMaterial
          color={isSelected ? '#fbbf24' : '#165DFF'}
          roughness={0.4}
          emissive={isSelected ? '#fbbf24' : '#165DFF'}
          emissiveIntensity={0.3}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html
          position={[radius + 8, boreholeDepth * -0.3, 0]}
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-2 min-w-[120px] pointer-events-none">
            <div className="text-sm font-semibold text-slate-800">{borehole.code}</div>
            <div className="text-xs text-slate-500 mt-0.5">{borehole.name}</div>
            <div className="text-xs font-mono text-slate-600 mt-1">
              深{borehole.totalDepth.toFixed(1)}m
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {borehole.layers.length}层
            </div>
          </div>
        </Html>
      )}

      {showLabel && (
        <Text
          position={[0, 6, 0]}
          fontSize={isSelected ? 5 : 4}
          color={isSelected ? '#fbbf24' : '#165DFF'}
          anchorX="center"
          anchorY="bottom"
        >
          <b>{borehole.code}</b>
        </Text>
      )}
    </group>
  );
};

const Fault3D: React.FC<{
  fault: Fault;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  verticalExaggeration: number;
}> = ({ fault, bounds, verticalExaggeration }) => {
  const startX = (fault.startPoint.lng - (bounds.minX + bounds.maxX) / 2) * 10000;
  const startZ = (fault.startPoint.lat - (bounds.minZ + bounds.maxZ) / 2) * 10000;
  const endX = (fault.endPoint.lng - (bounds.minX + bounds.maxX) / 2) * 10000;
  const endZ = (fault.endPoint.lat - (bounds.minZ + bounds.maxZ) / 2) * 10000;

  const midX = (startX + endX) / 2;
  const midZ = (startZ + endZ) / 2;
  const depth = (bounds.maxY - bounds.minY) * verticalExaggeration * 1.2;

  const dipRad = (fault.dipAngle * Math.PI) / 180;
  const planeWidth = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
  const planeHeight = depth / Math.sin(dipRad);
  const rotationY = Math.atan2(endZ - startZ, endX - startX);

  const isNormal = fault.type === 'normal';
  const isReverse = fault.type === 'reverse';
  const color = isNormal ? '#DC2626' : isReverse ? '#7C3AED' : '#059669';

  return (
    <group>
      <mesh
        position={[midX, -depth / 2, midZ]}
        rotation={[Math.PI / 2 - dipRad, -rotationY, 0]}
      >
        <planeGeometry args={[planeWidth + 20, planeHeight]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Line
        points={[
          [startX, 5, startZ],
          [endX, 5, endZ],
        ]}
        color={color}
        lineWidth={3}
        dashed
        dashSize={6}
        gapSize={4}
      />

      <Line
        points={[
          [startX, 5, startZ],
          [startX, -depth, startZ],
        ]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={4}
        gapSize={3}
      />

      <Line
        points={[
          [endX, 5, endZ],
          [endX, -depth, endZ],
        ]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={4}
        gapSize={3}
      />

      <Text
        position={[midX, 12, midZ]}
        fontSize={6}
        color={color}
        anchorX="center"
        anchorY="bottom"
      >
        <b>{fault.name}</b>
      </Text>

      <Text
        position={[midX, -2, midZ]}
        fontSize={4}
        color={color}
        anchorX="center"
        anchorY="top"
      >
        {isNormal ? '正断层' : isReverse ? '逆断层' : '走滑断层'} · 落差{fault.throwAmount}m
      </Text>
    </group>
  );
};

const GroundGrid: React.FC<{
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}> = ({ bounds }) => {
  const width = (bounds.maxX - bounds.minX) * 10000 + 100;
  const height = (bounds.maxZ - bounds.minZ) * 10000 + 100;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#f8fafc" roughness={1} />
      </mesh>

      <gridHelper
        args={[width, Math.floor(width / 20), '#cbd5e1', '#e2e8f0']}
        position={[0, -0.5, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <planeGeometry args={[width - 4, height - 4]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

const AxesHelper3D: React.FC<{ size?: number }> = ({ size = 50 }) => {
  return (
    <group position={[-180, -5, -180]}>
      <Line
        points={[[0, 0, 0], [size, 0, 0]]}
        color="#ef4444"
        lineWidth={2}
      />
      <Text position={[size + 5, 0, 0]} fontSize={4} color="#ef4444">
        <b>X</b>
      </Text>

      <Line
        points={[[0, 0, 0], [0, size, 0]]}
        color="#22c55e"
        lineWidth={2}
      />
      <Text position={[0, size + 5, 0]} fontSize={4} color="#22c55e">
        <b>Y</b>
      </Text>

      <Line
        points={[[0, 0, 0], [0, 0, size]]}
        color="#3b82f6"
        lineWidth={2}
      />
      <Text position={[0, 0, size + 5]} fontSize={4} color="#3b82f6">
        <b>Z</b>
      </Text>
    </group>
  );
};

const ScaleIndicator: React.FC<{
  verticalExaggeration: number;
}> = ({ verticalExaggeration }) => {
  return (
    <Html position={[160, 5, 160]} distanceFactor={8}>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-2 pointer-events-none">
        <div className="text-xs font-medium text-slate-700 mb-1">比例尺</div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
          <span className="text-xs text-slate-600 font-mono">50m</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          垂直放大: {verticalExaggeration}×
        </div>
      </div>
    </Html>
  );
};

const CameraController: React.FC<{
  viewMode: string;
  onViewChange?: () => void;
}> = ({ viewMode, onViewChange }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useFrame(() => {
    if (viewMode && VIEW_MODES[viewMode]) {
      const { position, target } = VIEW_MODES[viewMode];
      camera.position.lerp(new THREE.Vector3(...position), 0.05);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(...target), 0.05);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={30}
      maxDistance={800}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onChange={onViewChange}
    />
  );
};

export const Borehole3DViewer: React.FC<Borehole3DViewerProps> = ({
  boreholes,
  lithologyDict,
  faults = [],
  onBoreholeSelect,
  selectedBoreholeId,
  showGrid = true,
  showAxes = true,
  showLabels = true,
  verticalExaggeration = 5,
}) => {
  const [viewMode, setViewMode] = useState('isometric');
  const [viewModeKey, setViewModeKey] = useState(0);

  const bounds = useMemo(() => {
    if (boreholes.length === 0) {
      return { minX: -50, maxX: 50, minZ: -50, maxZ: 50, minY: 0, maxY: 50 };
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let maxDepth = 0;
    let maxElev = -Infinity;

    boreholes.forEach((bh) => {
      minLng = Math.min(minLng, bh.longitude);
      maxLng = Math.max(maxLng, bh.longitude);
      minLat = Math.min(minLat, bh.latitude);
      maxLat = Math.max(maxLat, bh.latitude);
      maxDepth = Math.max(maxDepth, bh.totalDepth);
      maxElev = Math.max(maxElev, bh.elevation);
    });

    return {
      minX: minLng,
      maxX: maxLng,
      minZ: minLat,
      maxZ: maxLat,
      minY: 0,
      maxY: maxDepth,
    };
  }, [boreholes]);

  const center = useMemo(() => ({
    lng: (bounds.minX + bounds.maxX) / 2,
    lat: (bounds.minZ + bounds.maxZ) / 2,
  }), [bounds]);

  const boreholePositions = useMemo(() => {
    return boreholes.map((bh) => ({
      borehole: bh,
      position: [
        (bh.longitude - center.lng) * 10000,
        bh.elevation - bounds.minY,
        (bh.latitude - center.lat) * 10000,
      ] as [number, number, number],
    }));
  }, [boreholes, center, bounds]);

  const handleBoreholeClick = useCallback((borehole: Borehole) => {
    onBoreholeSelect?.(borehole);
  }, [onBoreholeSelect]);

  const handleViewChange = useCallback((mode: string) => {
    setViewMode(mode);
    setViewModeKey((k) => k + 1);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    onBoreholeSelect?.(null);
  }, [onBoreholeSelect]);

  if (boreholes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏗️</span>
          </div>
          <p className="text-lg font-medium text-slate-700">暂无钻孔数据</p>
          <p className="text-sm text-slate-500 mt-1">请先录入钻孔数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-2">
          <div className="text-xs font-medium text-slate-500 mb-1.5">视角</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => handleViewChange('isometric')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'isometric'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              等轴测
            </button>
            <button
              onClick={() => handleViewChange('top')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'top'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              俯视
            </button>
            <button
              onClick={() => handleViewChange('front')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'front'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              正视
            </button>
            <button
              onClick={() => handleViewChange('side')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'side'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              侧视
            </button>
          </div>
        </div>
      </div>

      <Canvas
        camera={{ position: [200, 200, 200], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #f0f9ff, #e0f2fe)' }}
        onClick={handleBackgroundClick}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[100, 200, 100]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-100, 100, -100]} intensity={0.4} />
        <hemisphereLight args={['#87CEEB', '#362d1f', 0.3]} />

        {showGrid && <GroundGrid bounds={bounds} />}
        {showAxes && <AxesHelper3D size={40} />}
        <ScaleIndicator verticalExaggeration={verticalExaggeration} />

        {faults.map((fault) => (
          <Fault3D
            key={fault.id}
            fault={fault}
            bounds={bounds}
            verticalExaggeration={verticalExaggeration}
          />
        ))}

        {boreholePositions.map(({ borehole, position }) => (
          <Borehole3D
            key={borehole.id}
            borehole={borehole}
            position={position}
            lithologyDict={lithologyDict}
            verticalExaggeration={verticalExaggeration}
            isSelected={selectedBoreholeId === borehole.id}
            onClick={() => handleBoreholeClick(borehole)}
            showLabel={showLabels}
          />
        ))}

        <CameraController
          key={viewModeKey}
          viewMode={viewMode}
          onViewChange={() => setViewMode('custom')}
        />
      </Canvas>
    </div>
  );
};

export default Borehole3DViewer;
