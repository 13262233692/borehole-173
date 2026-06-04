import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store';
import { BoreholeChart } from '@/components/chart/BoreholeChart';
import type { Borehole } from '../../shared/types';

interface FormLayer {
  id: string;
  layerIndex: number;
  depthFrom: number;
  depthTo: number;
  thickness: number;
  lithologyCode: string;
  lithologyName: string;
  lithologyDesc: string;
  color: string;
  structure: string;
  weathering: string;
  remarks: string;
}

interface FormErrors {
  code?: string;
  name?: string;
  longitude?: string;
  latitude?: string;
  elevation?: string;
  totalDepth?: string;
  drillingDate?: string;
  driller?: string;
  layers?: { [key: number]: string };
}

const BoreholeForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { lithologyDict, projects, createBorehole, updateBorehole, fetchBoreholeById, loading, error, fetchLithologyDict, fetchProjects } = useAppStore();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [longitude, setLongitude] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [elevation, setElevation] = useState<string>('');
  const [totalDepth, setTotalDepth] = useState<string>('');
  const [drillingDate, setDrillingDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [driller, setDriller] = useState('');
  const [recorder, setRecorder] = useState('');
  const [geologist, setGeologist] = useState('');
  const [layers, setLayers] = useState<FormLayer[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchLithologyDict();
    fetchProjects();
  }, [fetchLithologyDict, fetchProjects]);

  const loadBoreholeData = useCallback(async (boreholeId: string) => {
    const borehole = await fetchBoreholeById(boreholeId);
    if (borehole) {
      setCode(borehole.code);
      setName(borehole.name);
      setLongitude(borehole.longitude.toString());
      setLatitude(borehole.latitude.toString());
      setElevation(borehole.elevation.toString());
      setTotalDepth(borehole.totalDepth.toString());
      setDrillingDate(borehole.drillingDate);
      setProjectId(borehole.projectId || '');
      setDriller(borehole.driller);
      setRecorder(borehole.recorder);
      setGeologist(borehole.geologist);
      setLayers(borehole.layers.map(layer => ({
        id: layer.id,
        layerIndex: layer.layerIndex,
        depthFrom: layer.depthFrom,
        depthTo: layer.depthTo,
        thickness: layer.thickness,
        lithologyCode: layer.lithologyCode,
        lithologyName: layer.lithologyName,
        lithologyDesc: layer.lithologyDesc,
        color: layer.color,
        structure: layer.structure,
        weathering: layer.weathering,
        remarks: layer.remarks,
      })));
    }
  }, [fetchBoreholeById]);

  useEffect(() => {
    if (isEdit && id) {
      loadBoreholeData(id);
    }
  }, [isEdit, id, loadBoreholeData]);

  const previewBorehole = useMemo((): Borehole => {
    const layersWithIds = layers.map((layer) => ({
      ...layer,
      boreholeId: id || 'temp',
    }));

    return {
      id: id || 'temp',
      code: code || '未命名',
      name: name || '',
      longitude: parseFloat(longitude) || 0,
      latitude: parseFloat(latitude) || 0,
      elevation: parseFloat(elevation) || 0,
      totalDepth: parseFloat(totalDepth) || 0,
      drillingDate,
      projectId: projectId || undefined,
      projectName: projects.find(p => p.id === projectId)?.name,
      driller,
      recorder,
      geologist,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      layers: layersWithIds,
    };
  }, [code, name, longitude, latitude, elevation, totalDepth, drillingDate, projectId, driller, recorder, geologist, layers, id, projects]);

  const getLithologyName = (lithologyCode: string): string => {
    const lithology = lithologyDict.find(l => l.code === lithologyCode);
    return lithology?.name || lithologyCode;
  };

  const addLayer = () => {
    const lastDepthTo = layers.length > 0 ? layers[layers.length - 1].depthTo : 0;
    const newLayer: FormLayer = {
      id: `temp-${Date.now()}`,
      layerIndex: layers.length + 1,
      depthFrom: lastDepthTo,
      depthTo: lastDepthTo + 2,
      thickness: 2,
      lithologyCode: '',
      lithologyName: '',
      lithologyDesc: '',
      color: '',
      structure: '',
      weathering: '',
      remarks: '',
    };
    setLayers([...layers, newLayer]);
  };

  const removeLayer = (index: number) => {
    const newLayers = layers.filter((_, i) => i !== index);
    const reindexedLayers = newLayers.map((layer, i) => ({
      ...layer,
      layerIndex: i + 1,
    }));
    setLayers(reindexedLayers);
  };

  const updateLayer = (index: number, field: keyof FormLayer, value: string | number) => {
    const newLayers = [...layers];
    const layer = { ...newLayers[index] };

    if (field === 'depthFrom' || field === 'depthTo' || field === 'thickness') {
      layer[field] = Number(value);
    } else {
      (layer as Record<string, string | number>)[field] = value;
    }

    if (field === 'depthFrom' || field === 'depthTo') {
      layer.depthFrom = Number(layer.depthFrom);
      layer.depthTo = Number(layer.depthTo);
      layer.thickness = Math.max(0, layer.depthTo - layer.depthFrom);
    }

    if (field === 'lithologyCode') {
      layer.lithologyName = getLithologyName(value as string);
    }

    newLayers[index] = layer;
    setLayers(newLayers);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!code.trim()) newErrors.code = '钻孔编号不能为空';
    if (!name.trim()) newErrors.name = '钻孔名称不能为空';
    if (!longitude || isNaN(parseFloat(longitude))) newErrors.longitude = '请输入有效的经度';
    if (!latitude || isNaN(parseFloat(latitude))) newErrors.latitude = '请输入有效的纬度';
    if (!elevation || isNaN(parseFloat(elevation))) newErrors.elevation = '请输入有效的高程';
    if (!totalDepth || isNaN(parseFloat(totalDepth)) || parseFloat(totalDepth) <= 0) newErrors.totalDepth = '请输入有效的总深度';
    if (!drillingDate) newErrors.drillingDate = '请选择施工日期';
    if (!driller.trim()) newErrors.driller = '施工人员不能为空';

    newErrors.layers = {};
    layers.forEach((layer, index) => {
      if (layer.depthTo <= layer.depthFrom) {
        newErrors.layers![index] = '深度到必须大于深度从';
      }
      if (!layer.lithologyCode) {
        newErrors.layers![index] = newErrors.layers![index] ? newErrors.layers![index] + '；请选择岩性编码' : '请选择岩性编码';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newErrors.layers || {}).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const boreholeData = {
      code,
      name,
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      elevation: parseFloat(elevation),
      totalDepth: parseFloat(totalDepth),
      drillingDate,
      projectId: projectId || undefined,
      driller,
      recorder,
      geologist,
      status: 'draft' as const,
    };

    const layersData = layers.map(layer => ({
      layerIndex: layer.layerIndex,
      depthFrom: layer.depthFrom,
      depthTo: layer.depthTo,
      thickness: layer.thickness,
      lithologyCode: layer.lithologyCode,
      lithologyName: layer.lithologyName,
      lithologyDesc: layer.lithologyDesc,
      color: layer.color,
      structure: layer.structure,
      weathering: layer.weathering,
      remarks: layer.remarks,
    }));

    if (isEdit && id) {
      const result = await updateBorehole(id, boreholeData);
      if (result) {
        navigate('/');
      }
    } else {
      const result = await createBorehole(boreholeData);
      if (result) {
        const boreholeId = result.id;
        for (const layer of layersData) {
          await useAppStore.getState().addLayer(boreholeId, layer);
        }
        navigate('/');
      }
    }
  };

  const inputClass = (error?: string) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors ${
      error ? 'border-red-500 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            返回
          </button>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? '编辑钻孔' : '新增钻孔'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">基本信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    钻孔编号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="例如：ZK001"
                    className={inputClass(errors.code)}
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    钻孔名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：一号钻孔"
                    className={inputClass(errors.name)}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    经度 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="例如：116.397"
                    className={inputClass(errors.longitude)}
                  />
                  {errors.longitude && <p className="mt-1 text-xs text-red-500">{errors.longitude}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    纬度 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="例如：39.908"
                    className={inputClass(errors.latitude)}
                  />
                  {errors.latitude && <p className="mt-1 text-xs text-red-500">{errors.latitude}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    高程(m) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={elevation}
                    onChange={(e) => setElevation(e.target.value)}
                    placeholder="例如：50.50"
                    className={inputClass(errors.elevation)}
                  />
                  {errors.elevation && <p className="mt-1 text-xs text-red-500">{errors.elevation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    总深度(m) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalDepth}
                    onChange={(e) => setTotalDepth(e.target.value)}
                    placeholder="例如：30.00"
                    className={inputClass(errors.totalDepth)}
                  />
                  {errors.totalDepth && <p className="mt-1 text-xs text-red-500">{errors.totalDepth}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    施工日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={drillingDate}
                    onChange={(e) => setDrillingDate(e.target.value)}
                    className={inputClass(errors.drillingDate)}
                  />
                  {errors.drillingDate && <p className="mt-1 text-xs text-red-500">{errors.drillingDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所属项目</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={inputClass()}
                  >
                    <option value="">请选择项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    施工人员 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={driller}
                    onChange={(e) => setDriller(e.target.value)}
                    placeholder="施工人员姓名"
                    className={inputClass(errors.driller)}
                  />
                  {errors.driller && <p className="mt-1 text-xs text-red-500">{errors.driller}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">记录人员</label>
                  <input
                    type="text"
                    value={recorder}
                    onChange={(e) => setRecorder(e.target.value)}
                    placeholder="记录人员姓名"
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">地质工程师</label>
                  <input
                    type="text"
                    value={geologist}
                    onChange={(e) => setGeologist(e.target.value)}
                    placeholder="地质工程师姓名"
                    className={inputClass()}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">地层分层</h2>
                <button
                  onClick={addLayer}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Plus size={18} />
                  添加地层
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">层号</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">深度从(m)</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">深度到(m)</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">厚度(m)</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">岩性编码</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">岩性名称</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">岩性描述</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">颜色</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">构造</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">风化程度</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200">备注</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-600 border-b border-slate-200">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map((layer, index) => (
                      <tr key={layer.id} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="px-2 py-2">
                          <span className="text-sm text-slate-700">{layer.layerIndex}</span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={layer.depthFrom}
                            onChange={(e) => updateLayer(index, 'depthFrom', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={layer.depthTo}
                            onChange={(e) => updateLayer(index, 'depthTo', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-sm text-slate-700 font-mono">{layer.thickness.toFixed(2)}</span>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={layer.lithologyCode}
                            onChange={(e) => updateLayer(index, 'lithologyCode', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          >
                            <option value="">选择</option>
                            {lithologyDict.map((litho) => (
                              <option key={litho.code} value={litho.code}>
                                {litho.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-sm text-slate-700">{layer.lithologyName}</span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={layer.lithologyDesc}
                            onChange={(e) => updateLayer(index, 'lithologyDesc', e.target.value)}
                            className="w-32 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={layer.color}
                            onChange={(e) => updateLayer(index, 'color', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={layer.structure}
                            onChange={(e) => updateLayer(index, 'structure', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={layer.weathering}
                            onChange={(e) => updateLayer(index, 'weathering', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          >
                            <option value="">选择</option>
                            <option value="未风化">未风化</option>
                            <option value="微风化">微风化</option>
                            <option value="中等风化">中等风化</option>
                            <option value="强风化">强风化</option>
                            <option value="全风化">全风化</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={layer.remarks}
                            onChange={(e) => updateLayer(index, 'remarks', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeLayer(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          {errors.layers?.[index] && (
                            <p className="mt-1 text-xs text-red-500">{errors.layers[index]}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                    {layers.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                          暂无地层数据，点击"添加地层"按钮开始录入
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors"
              >
                <Save size={18} />
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">实时预览</h2>
              <BoreholeChart
                borehole={previewBorehole}
                lithologyDict={lithologyDict}
                width={600}
                height={700}
                showLegend={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoreholeForm;
