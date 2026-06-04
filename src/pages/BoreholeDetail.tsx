import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Download, MapPin, Layers, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { BoreholeChart } from '@/components/chart/BoreholeChart';
import { BoreholeMap } from '@/components/map/BoreholeMap';
import { cn } from '@/lib/utils';
import type { StratumLayer } from '../../shared/types';

type TabType = 'chart' | 'layers' | 'map';

const statusConfig = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  approved: { label: '已审核', className: 'bg-blue-100 text-blue-700' },
};

const BoreholeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    currentBorehole,
    lithologyDict,
    loading,
    error,
    fetchBoreholeById,
    fetchLithologyDict,
    deleteBorehole,
    setError,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('chart');

  useEffect(() => {
    fetchLithologyDict();
  }, [fetchLithologyDict]);

  useEffect(() => {
    if (id) {
      fetchBoreholeById(id);
    }
    return () => {
      setError(null);
    };
  }, [id, fetchBoreholeById, setError]);

  const handleEdit = () => {
    if (id) {
      navigate(`/borehole/edit/${id}`);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('确定要删除该钻孔吗？此操作不可恢复。')) {
      const success = await deleteBorehole(id);
      if (success) {
        navigate('/');
      }
    }
  };

  const handleExport = () => {
    if (!currentBorehole) return;
    alert(`导出钻孔 ${currentBorehole.code} 数据`);
  };

  const handleBack = () => {
    navigate('/');
  };

  const tabs = [
    { key: 'chart' as TabType, label: '柱状图', icon: BarChart3 },
    { key: 'layers' as TabType, label: '地层信息', icon: Layers },
    { key: 'map' as TabType, label: '位置分布', icon: MapPin },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-600">加载钻孔数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-700">加载失败</h2>
              <p className="text-red-600">{error}</p>
              <button
                onClick={handleBack}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                返回列表
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBorehole) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">钻孔不存在</h2>
            <p className="text-slate-500 mb-6">未找到对应的钻孔数据，可能已被删除或ID无效</p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const borehole = currentBorehole;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button
            onClick={handleBack}
            className="hover:text-blue-600 transition-colors"
          >
            钻孔管理
          </button>
          <span>/</span>
          <span className="text-slate-700 font-medium">{borehole.code}</span>
        </nav>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-800">
                  {borehole.code} - {borehole.name}
                </h1>
                <span className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                  statusConfig[borehole.status].className
                )}>
                  {statusConfig[borehole.status].label}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">经度</p>
                  <p className="text-sm font-medium text-slate-700 font-mono">{borehole.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">纬度</p>
                  <p className="text-sm font-medium text-slate-700 font-mono">{borehole.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">孔口高程</p>
                  <p className="text-sm font-medium text-slate-700 font-mono">{borehole.elevation.toFixed(2)} m</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">总深度</p>
                  <p className="text-sm font-medium text-slate-700 font-mono">{borehole.totalDepth.toFixed(2)} m</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">地层数</p>
                  <p className="text-sm font-medium text-slate-700">{borehole.layers.length} 层</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">施工日期</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(borehole.drillingDate)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                {borehole.projectName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">所属项目</p>
                    <p className="text-sm font-medium text-slate-700">{borehole.projectName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-1">施工人员</p>
                  <p className="text-sm font-medium text-slate-700">{borehole.driller}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">记录人员</p>
                  <p className="text-sm font-medium text-slate-700">{borehole.recorder || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">地质工程师</p>
                  <p className="text-sm font-medium text-slate-700">{borehole.geologist || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-col gap-2">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 size={16} />
                编辑
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={16} />
                导出
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'chart' && (
              <BoreholeChart
                borehole={borehole}
                lithologyDict={lithologyDict}
                width={800}
                height={900}
                showLegend={true}
              />
            )}

            {activeTab === 'layers' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">层号</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">深度从 (m)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">深度到 (m)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">厚度 (m)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">岩性编码</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">岩性名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">岩性描述</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">颜色</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">构造</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">风化程度</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {borehole.layers.map((layer: StratumLayer) => (
                      <tr key={layer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-700">{layer.layerIndex}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 font-mono">{layer.depthFrom.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 font-mono">{layer.depthTo.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-700 font-mono">{layer.thickness.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 font-mono">{layer.lithologyCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-slate-300"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span className="text-sm text-slate-700">{layer.lithologyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{layer.lithologyDesc || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{layer.color || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{layer.structure || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{layer.weathering || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{layer.remarks || '-'}</span>
                        </td>
                      </tr>
                    ))}
                    {borehole.layers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Layers className="w-10 h-10 text-slate-300" />
                            <p className="text-sm text-slate-500">暂无地层数据</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'map' && (
              <div>
                <BoreholeMap
                  boreholes={[borehole]}
                  selectedBoreholeId={borehole.id}
                  height={600}
                  showDrawTools={false}
                />
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">位置信息</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">经度：</span>
                      <span className="text-slate-700 font-mono">{borehole.longitude.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">纬度：</span>
                      <span className="text-slate-700 font-mono">{borehole.latitude.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">孔口高程：</span>
                      <span className="text-slate-700 font-mono">{borehole.elevation.toFixed(2)} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500">总深度：</span>
                      <span className="text-slate-700 font-mono">{borehole.totalDepth.toFixed(2)} m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          <button
            onClick={handleBack}
            className="w-12 h-12 bg-slate-600 hover:bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
            title="返回列表"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleEdit}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
            title="编辑钻孔"
          >
            <Edit2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoreholeDetail;
