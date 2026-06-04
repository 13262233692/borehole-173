import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import type { Borehole } from '../../shared/types';

interface FilterState {
  keyword: string;
  projectId: string;
  minDepth: string;
  maxDepth: string;
  lithologyCodes: string[];
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

const statusConfig = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  approved: { label: '已审核', className: 'bg-blue-100 text-blue-700' },
};

export default function BoreholeList() {
  const { 
    boreholes, 
    projects, 
    lithologyDict, 
    loading, 
    fetchBoreholes, 
    fetchProjects, 
    fetchLithologyDict,
    deleteBorehole 
  } = useAppStore();

  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    projectId: '',
    minDepth: '',
    maxDepth: '',
    lithologyCodes: [],
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [apiData, setApiData] = useState<Borehole[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchLithologyDict();
  }, [fetchProjects, fetchLithologyDict]);

  const loadBoreholes = useCallback(async () => {
    const params: {
      page: number;
      pageSize: number;
      keyword?: string;
      projectId?: string;
      minDepth?: number;
      maxDepth?: number;
      lithologyCodes?: string[];
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.minDepth) params.minDepth = Number(filters.minDepth);
    if (filters.maxDepth) params.maxDepth = Number(filters.maxDepth);
    if (filters.lithologyCodes.length > 0) params.lithologyCodes = filters.lithologyCodes;

    try {
      await fetchBoreholes(params);
      const store = useAppStore.getState();
      if (store.boreholes.length > 0) {
        setApiData(store.boreholes);
        setPagination(prev => ({ ...prev, total: store.boreholes.length }));
      }
    } catch (error) {
      console.error('Failed to load boreholes:', error);
    }
  }, [pagination.page, pagination.pageSize, filters, fetchBoreholes]);

  useEffect(() => {
    loadBoreholes();
  }, [loadBoreholes]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadBoreholes();
  };

  const handleReset = () => {
    setFilters({
      keyword: '',
      projectId: '',
      minDepth: '',
      maxDepth: '',
      lithologyCodes: [],
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => loadBoreholes(), 0);
  };

  const handleFilterChange = (key: keyof FilterState, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLithologyToggle = (code: string) => {
    setFilters(prev => ({
      ...prev,
      lithologyCodes: prev.lithologyCodes.includes(code)
        ? prev.lithologyCodes.filter(c => c !== code)
        : [...prev.lithologyCodes, code],
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayData.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除该钻孔吗？')) {
      await deleteBorehole(id);
      loadBoreholes();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 个钻孔吗？`)) {
      for (const id of selectedIds) {
        await deleteBorehole(id);
      }
      setSelectedIds([]);
      loadBoreholes();
    }
  };

  const handleExport = () => {
    alert(`导出 ${selectedIds.length > 0 ? selectedIds.length : '全部'} 钻孔数据`);
  };

  const displayData = useMemo(() => {
    if (apiData.length > 0) {
      const start = (pagination.page - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      return apiData.slice(start, end);
    }
    if (boreholes.length > 0) {
      const start = (pagination.page - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      return boreholes.slice(start, end);
    }
    return [];
  }, [apiData, boreholes, pagination.page, pagination.pageSize]);

  const totalCount = apiData.length > 0 ? apiData.length : boreholes.length;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const isAllSelected = displayData.length > 0 && displayData.every(b => selectedIds.includes(b.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const lithologyCategories = useMemo(() => {
    const categories = new Map<string, typeof lithologyDict>();
    lithologyDict.forEach(item => {
      if (!categories.has(item.category)) {
        categories.set(item.category, []);
      }
      categories.get(item.category)!.push(item);
    });
    return categories;
  }, [lithologyDict]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">钻孔管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            批量导出
          </button>
          <button
            onClick={() => alert('新增钻孔')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增钻孔
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">关键词搜索</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入钻孔编号、名称..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">所属项目</label>
            <select
              value={filters.projectId}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">全部项目</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">深度范围 (m)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filters.minDepth}
                onChange={(e) => handleFilterChange('minDepth', e.target.value)}
                placeholder="最小"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={filters.maxDepth}
                onChange={(e) => handleFilterChange('maxDepth', e.target.value)}
                placeholder="最大"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">岩性筛选</label>
          <div className="flex flex-wrap gap-2">
            {Array.from(lithologyCategories.entries()).map(([category, items]) => (
              <div key={category} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">{category}:</span>
                {items.map(item => (
                  <button
                    key={item.code}
                    onClick={() => handleLithologyToggle(item.code)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md border transition-colors',
                      filters.lithologyCodes.includes(item.code)
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">共 {totalCount} 条记录</span>
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-blue-600">已选 {selectedIds.length} 条</span>
              <button
                onClick={handleBatchDelete}
                className="text-sm text-red-600 hover:text-red-700"
              >
                批量删除
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">每页</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-slate-500">条</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => el && (el.indeterminate = isIndeterminate)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">钻孔编号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">钻孔名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">位置</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">深度 (m)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">高程 (m)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">所属项目</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-sm text-slate-500">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-slate-500">暂无钻孔数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((borehole) => (
                  <tr key={borehole.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(borehole.id)}
                        onChange={(e) => handleSelect(borehole.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">{borehole.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{borehole.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {borehole.longitude.toFixed(4)}, {borehole.latitude.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 font-mono">{borehole.totalDepth.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 font-mono">{borehole.elevation.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{borehole.projectName || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusConfig[borehole.status].className
                      )}>
                        {statusConfig[borehole.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => alert(`查看详情: ${borehole.code}`)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => alert(`编辑: ${borehole.code}`)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(borehole.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              第 {pagination.page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      'w-8 h-8 text-sm rounded-md transition-colors',
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={pagination.page === totalPages}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
