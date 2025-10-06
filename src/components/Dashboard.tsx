import React, { useEffect, useState } from 'react';
import { Users, Headphones, TrendingUp, BarChart3 } from 'lucide-react';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    suportesMes: 0,
    clientesAtivos: 0,
    tiposSuporte: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema de suporte</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total de Clientes"
          value={stats.totalClientes}
          color="blue"
        />
        <StatCard
          icon={<Headphones className="w-6 h-6" />}
          title="Suportes no Mês"
          value={stats.suportesMes}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Clientes Ativos"
          value={stats.clientesAtivos}
          color="orange"
        />
        <StatCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="Tipos de Suporte"
          value={stats.tiposSuporte.length}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tipos de Suporte Mais Comuns</h2>
        <div className="space-y-3">
          {stats.tiposSuporte.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-700">{item.tipo || 'Não especificado'}</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((item.total / (stats.tiposSuporte[0]?.total || 1)) * 100, 100)}%`
                    }}
                  />
                </div>
                <span className="font-semibold text-gray-900 w-8 text-right">{item.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
