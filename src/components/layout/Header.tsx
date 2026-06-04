import React from 'react';
import { Menu, Bell, User, Search } from 'lucide-react';
import { useAppStore } from '@/store';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { statistics, fetchStatistics } = useAppStore();

  React.useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索钻孔编号、名称..."
            className="pl-10 pr-4 py-2 w-64 border border-slate-200 rounded text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {statistics && (
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">钻孔总数</span>
              <span className="font-semibold text-primary-600">{statistics.totalBoreholes}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">总进尺</span>
              <span className="font-semibold text-primary-600">{statistics.totalDepth}m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">平均深度</span>
              <span className="font-semibold text-primary-600">{statistics.averageDepth}m</span>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-slate-200" />

        <button className="relative p-2 hover:bg-slate-100 rounded transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded transition-colors">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700">管理员</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
