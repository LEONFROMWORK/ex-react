'use client';

import { useState } from 'react';
import { FileSpreadsheet, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      label: '총 분석 수',
      value: '24',
      icon: FileSpreadsheet,
      change: '+12%',
      changeType: 'positive',
    },
    {
      label: '성공률',
      value: '98.5%',
      icon: CheckCircle,
      change: '+2.3%',
      changeType: 'positive',
    },
    {
      label: '평균 처리 시간',
      value: '2.3초',
      icon: Clock,
      change: '-15%',
      changeType: 'positive',
    },
    {
      label: '절약된 시간',
      value: '12시간',
      icon: TrendingUp,
      change: '+45%',
      changeType: 'positive',
    },
  ];

  const recentAnalyses = [
    {
      id: 1,
      fileName: '매출_보고서_2024.xlsx',
      status: '완료',
      time: '2분 전',
      errors: 3,
      fixed: 3,
    },
    {
      id: 2,
      fileName: '재고_현황_Q4.xlsx',
      status: '처리중',
      time: '5분 전',
      errors: 12,
      fixed: 8,
    },
    {
      id: 3,
      fileName: '고객_데이터_분석.xlsx',
      status: '완료',
      time: '1시간 전',
      errors: 0,
      fixed: 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          대시보드
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          엑셀 분석 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Analyses */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            최근 분석 내역
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  파일명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  오류/수정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  시간
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {recentAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {analysis.fileName}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        analysis.status === '완료'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {analysis.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {analysis.errors}/{analysis.fixed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {analysis.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}