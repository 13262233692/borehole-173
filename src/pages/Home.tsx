import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Ruler,
  FolderKanban,
  Layers,
  Plus,
  LineChart,
  MapPin,
  Download,
  ChevronRight,
  Calendar,
  Map,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Borehole } from '../../shared/types';

interface LithologyDistributionItem {
  code: string;
  name: string;
  thickness: number;
  color: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  unit?: string;
}

function StatCard({ title, value, icon, color, loading, unit }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-slate-100 rounded animate-pulse" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {value}
              {unit && <span className="text-lg font-normal text-slate-500 ml-1">{unit}</span>}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            color
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ title, description, icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-left hover:border-primary-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
      </div>
    </button>
  );
}

interface BoreholeItemProps {
  borehole: Borehole;
  onClick: () => void;
}

function BoreholeItem({ borehole, onClick }: BoreholeItemProps) {
  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    approved: 'bg-blue-100 text-blue-700',
  };

  const statusText = {
    draft: '草稿',
    completed: '已完成',
    approved: '已审核',
  };

  return (
    <tr
      onClick={onClick}
      className="hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{borehole.code}</div>
        <div className="text-sm text-slate-500">{borehole.name}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-slate-600">
          <Ruler className="h-4 w-4" />
          <span>{borehole.totalDepth.toFixed(2)}m</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-slate-600">
          <Map className="h-4 w-4" />
          <span className="text-sm">{borehole.projectName || '-'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-slate-600">
          <Layers className="h-4 w-4" />
          <span>{borehole.layers.length} 层</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-slate-600">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{borehole.drillingDate}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            statusColors[borehole.status]
          )}
        >
          {statusText[borehole.status]}
        </span>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="mt-1 h-4 w-24 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-12 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-12 bg-slate-100 rounded animate-pulse" />
      </td>
    </tr>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const {
    boreholes,
    statistics,
    loading,
    fetchBoreholes,
    fetchStatistics,
    fetchLithologyDict,
    fetchProjects,
  } = useAppStore();

  useEffect(() => {
    fetchStatistics();
    fetchBoreholes({ pageSize: 10 });
    fetchLithologyDict();
    fetchProjects();
  }, [fetchStatistics, fetchBoreholes, fetchLithologyDict, fetchProjects]);

  const recentBoreholes = [...boreholes]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const lithologyData = (statistics?.lithologyDistribution as LithologyDistributionItem[]) || [];
  const maxThickness = Math.max(...lithologyData.map((d: LithologyDistributionItem) => d.thickness), 1);

  const handleBoreholeClick = (id: string) => {
    navigate(`/boreholes/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">地质钻孔管理平台</h1>
        <p className="mt-1 text-slate-500">
          管理和分析地质钻孔数据，支持剖面分析、空间查询等功能
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="钻孔总数"
          value={statistics?.totalBoreholes || 0}
          icon={<Database className="h-6 w-6 text-primary-600" />}
          color="bg-primary-50"
          loading={loading && !statistics}
        />
        <StatCard
          title="总进尺"
          value={statistics?.totalDepth?.toFixed(2) || 0}
          unit="m"
          icon={<Ruler className="h-6 w-6 text-green-600" />}
          color="bg-green-50"
          loading={loading && !statistics}
        />
        <StatCard
          title="项目数"
          value={statistics?.projects?.length || 0}
          icon={<FolderKanban className="h-6 w-6 text-amber-600" />}
          color="bg-amber-50"
          loading={loading && !statistics}
        />
        <StatCard
          title="岩性种类"
          value={lithologyData.length}
          icon={<Layers className="h-6 w-6 text-rose-600" />}
          color="bg-rose-50"
          loading={loading && !statistics}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          title="新增钻孔"
          description="创建新的钻孔记录，录入基本信息和地层数据"
          icon={<Plus className="h-6 w-6" />}
          onClick={() => navigate('/boreholes/new')}
        />
        <QuickAction
          title="剖面分析"
          description="选择钻孔生成地质剖面图，直观展示地层分布"
          icon={<LineChart className="h-6 w-6" />}
          onClick={() => navigate('/section')}
        />
        <QuickAction
          title="空间查询"
          description="通过地图或坐标范围查询符合条件的钻孔数据"
          icon={<MapPin className="h-6 w-6" />}
          onClick={() => navigate('/spatial')}
        />
        <QuickAction
          title="数据导出"
          description="将钻孔数据导出为 Excel、PDF、DXF 等格式"
          icon={<Download className="h-6 w-6" />}
          onClick={() => navigate('/export')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">最近钻孔</h2>
            <button
              onClick={() => navigate('/boreholes')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    钻孔信息
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    深度
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    项目
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    地层
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && recentBoreholes.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : recentBoreholes.length > 0 ? (
                  recentBoreholes.map((borehole) => (
                    <BoreholeItem
                      key={borehole.id}
                      borehole={borehole}
                      onClick={() => handleBoreholeClick(borehole.id)}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <Database className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-2">暂无钻孔数据</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">岩性分布统计</h2>
            <p className="text-sm text-slate-500 mt-1">按累计厚度统计</p>
          </div>
          <div className="p-6">
            {loading && lithologyData.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-6 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : lithologyData.length > 0 ? (
              <div className="space-y-4">
                {lithologyData
                  .sort(
                    (a: LithologyDistributionItem, b: LithologyDistributionItem) => b.thickness - a.thickness
                  )
                  .slice(0, 6)
                  .map((item: LithologyDistributionItem) => (
                    <div key={item.code} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm border border-slate-300"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-slate-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-slate-500">
                          {item.thickness.toFixed(1)}m
                        </span>
                      </div>
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(item.thickness / maxThickness) * 100}%`,
                            backgroundColor: item.color,
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Layers className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2">暂无岩性统计数据</p>
              </div>
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
