import { v4 as uuidv4 } from 'uuid';
import type { Borehole, LithologyDict, Project, StratumLayer, Fault } from '../../shared/types';

export const lithologyDict: LithologyDict[] = [
  { code: 'Q', name: '填土', category: '第四系', pattern: 'dots', color: '#D2B48C', description: '人工堆积的填土' },
  { code: 'Qml', name: '素填土', category: '第四系', pattern: 'dots', color: '#DEB887', description: '由碎石、砂土、粉土等组成的填土' },
  { code: 'Qpd', name: '耕植土', category: '第四系', pattern: 'crosshatch', color: '#8B4513', description: '含植物根茎的耕植土' },
  { code: 'Qal', name: '粉质黏土', category: '第四系', pattern: 'diagonal', color: '#CD853F', description: '冲洪积粉质黏土' },
  { code: 'Qpl', name: '粉土', category: '第四系', pattern: 'vertical', color: '#D2691E', description: '坡洪积粉土' },
  { code: 'Qs', name: '砂土', category: '第四系', pattern: 'horizontal', color: '#F4A460', description: '冲洪积砂土' },
  { code: 'Qc', name: '碎石土', category: '第四系', pattern: 'crosshatch', color: '#A0522D', description: '坡洪积碎石土' },
  { code: 'K', name: '泥岩', category: '白垩系', pattern: 'horizontal', color: '#696969', description: '白垩系泥岩' },
  { code: 'Ks', name: '砂岩', category: '白垩系', pattern: 'brick', color: '#A0522D', description: '白垩系砂岩' },
  { code: 'Kc', name: '砾岩', category: '白垩系', pattern: 'dots', color: '#8B4513', description: '白垩系砾岩' },
  { code: 'J', name: '页岩', category: '侏罗系', pattern: 'wavy', color: '#2F4F4F', description: '侏罗系页岩' },
  { code: 'Js', name: '石灰岩', category: '侏罗系', pattern: 'dots', color: '#F5F5DC', description: '侏罗系石灰岩' },
  { code: 'Jm', name: '煤层', category: '侏罗系', pattern: 'solid', color: '#2C2C2C', description: '侏罗系煤层' },
  { code: 'T', name: '花岗岩', category: '三叠系', pattern: 'random', color: '#808080', description: '三叠系花岗岩' },
  { code: 'Tg', name: '片麻岩', category: '三叠系', pattern: 'diagonal', color: '#556B2F', description: '三叠系片麻岩' },
  { code: 'Tm', name: '大理岩', category: '三叠系', pattern: 'vertical', color: '#FFFAF0', description: '三叠系大理岩' },
  { code: 'W', name: '地下水', category: '水文', pattern: 'solid', color: '#0EA5E9', description: '地下水水位' },
];

export const projects: Project[] = [
  {
    id: 'proj-001',
    name: '某新城地质勘察项目',
    description: '某市新城区详细地质勘察工程，共布置钻孔50个',
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    status: 'active',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'proj-002',
    name: '高速公路地质勘察',
    description: '某高速公路沿线地质勘察项目',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    status: 'active',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const createLayer = (
  boreholeId: string,
  layerIndex: number,
  depthFrom: number,
  depthTo: number,
  lithologyCode: string
): StratumLayer => {
  const lithology = lithologyDict.find(l => l.code === lithologyCode)!;
  return {
    id: uuidv4(),
    boreholeId,
    layerIndex,
    depthFrom,
    depthTo,
    thickness: Number((depthTo - depthFrom).toFixed(2)),
    lithologyCode,
    lithologyName: lithology.name,
    lithologyDesc: lithology.description,
    color: lithology.color,
    structure: '',
    weathering: layerIndex > 3 ? '中等风化' : '强风化',
    remarks: '',
  };
};

const createBorehole = (
  code: string,
  name: string,
  lng: number,
  lat: number,
  elevation: number,
  layersConfig: Array<[number, number, string]>,
  projectId: string = 'proj-001'
): Borehole => {
  const id = uuidv4();
  const totalDepth = layersConfig[layersConfig.length - 1][1];
  const now = new Date().toISOString();
  
  return {
    id,
    code,
    name,
    longitude: lng,
    latitude: lat,
    elevation,
    totalDepth,
    drillingDate: '2024-05-15',
    projectId,
    projectName: projects.find(p => p.id === projectId)?.name,
    driller: '某钻探工程公司',
    recorder: '张三',
    geologist: '李四',
    status: 'completed',
    createdAt: now,
    updatedAt: now,
    layers: layersConfig.map((config, idx) => createLayer(id, idx + 1, config[0], config[1], config[2])),
  };
};

export const sampleBoreholes: Borehole[] = [
  createBorehole(
    'ZK001', '1号钻孔', 116.4074, 39.9042, 45.2,
    [
      [0, 1.5, 'Qml'],
      [1.5, 3.2, 'Qpd'],
      [3.2, 8.5, 'Qal'],
      [8.5, 15.3, 'Qpl'],
      [15.3, 22.8, 'Qs'],
      [22.8, 30.5, 'K'],
      [30.5, 45.0, 'Ks'],
    ]
  ),
  createBorehole(
    'ZK002', '2号钻孔', 116.4085, 39.9055, 44.8,
    [
      [0, 1.2, 'Qml'],
      [1.2, 2.8, 'Qpd'],
      [2.8, 7.5, 'Qal'],
      [7.5, 14.2, 'Qpl'],
      [14.2, 21.5, 'Qs'],
      [21.5, 28.3, 'K'],
      [28.3, 42.0, 'Ks'],
    ]
  ),
  createBorehole(
    'ZK003', '3号钻孔', 116.4096, 39.9068, 46.5,
    [
      [0, 1.8, 'Qml'],
      [1.8, 3.5, 'Qpd'],
      [3.5, 9.2, 'Qal'],
      [9.2, 16.8, 'Qpl'],
      [16.8, 24.5, 'Qs'],
      [24.5, 32.2, 'K'],
      [32.2, 48.0, 'Ks'],
      [48.0, 55.0, 'Kc'],
    ]
  ),
  createBorehole(
    'ZK004', '4号钻孔', 116.4107, 39.9081, 43.9,
    [
      [0, 1.0, 'Qml'],
      [1.0, 2.5, 'Qpd'],
      [2.5, 6.8, 'Qal'],
      [6.8, 12.5, 'Qpl'],
      [12.5, 19.2, 'Qs'],
      [19.2, 26.8, 'K'],
      [26.8, 38.0, 'Ks'],
    ]
  ),
  createBorehole(
    'ZK005', '5号钻孔', 116.4118, 39.9094, 47.2,
    [
      [0, 2.0, 'Qml'],
      [2.0, 4.0, 'Qpd'],
      [4.0, 10.5, 'Qal'],
      [10.5, 18.2, 'Qpl'],
      [18.2, 26.5, 'Qs'],
      [26.5, 35.0, 'K'],
      [35.0, 50.0, 'Ks'],
      [50.0, 60.0, 'J'],
    ]
  ),
  createBorehole(
    'ZK006', '6号钻孔', 116.4063, 39.9055, 45.8,
    [
      [0, 1.5, 'Qml'],
      [1.5, 3.0, 'Qpd'],
      [3.0, 8.0, 'Qal'],
      [8.0, 15.0, 'Qpl'],
      [15.0, 23.0, 'Qs'],
      [23.0, 31.0, 'K'],
      [31.0, 40.0, 'Kc'],
    ]
  ),
  createBorehole(
    'ZK007', '7号钻孔', 116.4074, 39.9068, 44.5,
    [
      [0, 1.2, 'Qml'],
      [1.2, 2.8, 'Qpd'],
      [2.8, 7.0, 'Qal'],
      [7.0, 13.5, 'Qpl'],
      [13.5, 20.5, 'Qc'],
      [20.5, 28.0, 'K'],
      [28.0, 42.0, 'Ks'],
    ]
  ),
  createBorehole(
    'ZK008', '8号钻孔', 116.4085, 39.9081, 46.0,
    [
      [0, 1.8, 'Qml'],
      [1.8, 3.8, 'Qpd'],
      [3.8, 9.5, 'Qal'],
      [9.5, 17.0, 'Qpl'],
      [17.0, 25.0, 'Qs'],
      [25.0, 33.5, 'K'],
      [33.5, 45.0, 'Ks'],
      [45.0, 52.0, 'J'],
    ]
  ),
  createBorehole(
    'ZK009', '9号钻孔', 116.4096, 39.9094, 45.0,
    [
      [0, 1.5, 'Qml'],
      [1.5, 3.2, 'Qpd'],
      [3.2, 8.5, 'Qal'],
      [8.5, 16.0, 'Qpl'],
      [16.0, 24.0, 'Qs'],
      [24.0, 32.0, 'K'],
      [32.0, 45.0, 'Ks'],
    ]
  ),
  createBorehole(
    'ZK010', '10号钻孔', 116.4129, 39.9107, 47.5,
    [
      [0, 2.2, 'Qml'],
      [2.2, 4.5, 'Qpd'],
      [4.5, 11.0, 'Qal'],
      [11.0, 19.0, 'Qpl'],
      [19.0, 27.5, 'Qs'],
      [27.5, 36.0, 'K'],
      [36.0, 52.0, 'Ks'],
      [52.0, 65.0, 'T'],
    ]
  ),
];

export const sampleFaults: Fault[] = [
  {
    id: 'fault-001',
    name: 'F1正断层',
    type: 'normal',
    startPoint: { lng: 116.4090, lat: 39.9035 },
    endPoint: { lng: 116.4098, lat: 39.9100 },
    dipAngle: 65,
    throwAmount: 8.0,
    heaveAmount: 3.7,
    description: '场地主要正断层，走向NE-SW，倾向SE，上盘下降约8m',
    createdAt: '2024-05-01T00:00:00Z',
  },
  {
    id: 'fault-002',
    name: 'F2逆断层',
    type: 'reverse',
    startPoint: { lng: 116.4115, lat: 39.9040 },
    endPoint: { lng: 116.4120, lat: 39.9105 },
    dipAngle: 45,
    throwAmount: 5.0,
    heaveAmount: 5.0,
    description: '逆冲断层，走向NE-SW，倾向NW，上盘上升约5m',
    createdAt: '2024-05-01T00:00:00Z',
  },
];
