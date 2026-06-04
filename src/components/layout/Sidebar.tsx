import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Database, Route, Search, FileOutput, Map, PlusCircle, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '数据概览' },
  { path: '/boreholes', icon: Database, label: '钻孔管理' },
  { path: '/boreholes/new', icon: PlusCircle, label: '新增钻孔' },
  { path: '/section', icon: Route, label: '剖面分析' },
  { path: '/spatial', icon: Search, label: '空间查询' },
  { path: '/3d', icon: Box, label: '三维可视化' },
  { path: '/export', icon: FileOutput, label: '数据导出' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded flex items-center justify-center">
            <Map className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">地质钻孔</h1>
              <p className="text-xs text-slate-400">数据管理平台</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-slate-700 mt-auto">
          <div className="bg-slate-800 rounded p-3">
            <p className="text-xs text-slate-400 mb-1">当前项目</p>
            <p className="text-sm font-medium">某新城地质勘察项目</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
