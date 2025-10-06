import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Download, Eye } from 'lucide-react';
import { Suporte, Cliente } from '../types';
import SuporteModal from './SuporteModal';
import { generateSuportesPDF } from '../utils/pdfGenerator';

export default function Suportes() {
  const [suportes, setSuportes] = useState<Suporte[]>([]);
  const [filteredSuportes, setFilteredSuportes] = useState<Suporte[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingSuporte, setViewingSuporte] = useState<Suporte | null>(null);

  useEffect(() => {
    loadSuportes();
    loadClientes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterCliente, filterTipo, filterStatus, dateStart, dateEnd, suportes]);

  const loadSuportes = async () => {
    try {
      const response = await fetch('/api/suportes');
      const data = await response.json();
      setSuportes(data);
      setFilteredSuportes(data);
    } catch (error) {
      console.error('Erro ao carregar suportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      const data = await response.json();
      setClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...suportes];

    if (searchTerm) {
      filtered = filtered.filter(suporte =>
        suporte.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suporte.tecnico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suporte.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCliente) {
      filtered = filtered.filter(suporte => suporte.cliente_id === parseInt(filterCliente));
    }

    if (filterTipo) {
      filtered = filtered.filter(suporte => suporte.tipo === filterTipo);
    }

    if (filterStatus) {
      filtered = filtered.filter(suporte => suporte.status === filterStatus);
    }

    if (dateStart) {
      filtered = filtered.filter(suporte =>
        new Date(suporte.data_suporte) >= new Date(dateStart)
      );
    }

    if (dateEnd) {
      filtered = filtered.filter(suporte =>
        new Date(suporte.data_suporte) <= new Date(dateEnd)
      );
    }

    setFilteredSuportes(filtered);
  };

  const handleExportPDF = () => {
    generateSuportesPDF(filteredSuportes, {
      dateStart,
      dateEnd,
      cliente: filterCliente ? clientes.find(c => c.id === parseInt(filterCliente))?.nome : undefined,
      tipo: filterTipo || undefined,
      status: filterStatus || undefined
    });
  };

  const handleSave = () => {
    setModalOpen(false);
    loadSuportes();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-800';
      case 'em_andamento': return 'bg-yellow-100 text-yellow-800';
      case 'resolvido': return 'bg-green-100 text-green-800';
      case 'fechado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'resolvido': return 'Resolvido';
      case 'fechado': return 'Fechado';
      default: return status;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suportes</h1>
          <p className="text-gray-600 mt-1">Histórico de atendimentos realizados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Suporte
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por descrição, técnico ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os Clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>

            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os Tipos</option>
              <option value="criacao">Criação</option>
              <option value="migracao">Migração</option>
              <option value="configuracao">Configuração</option>
              <option value="senha">Senha</option>
              <option value="erro">Erro</option>
              <option value="outro">Outro</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os Status</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>

            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Data início"
            />

            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Data fim"
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredSuportes.length} suporte{filteredSuportes.length !== 1 ? 's' : ''} encontrado{filteredSuportes.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={handleExportPDF}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Data</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Cliente</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Tipo</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Técnico</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Descrição</th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">Status</th>
                <th className="text-right py-3 px-4 text-gray-700 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuportes.map((suporte) => (
                <tr key={suporte.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-700">
                    {new Date(suporte.data_suporte).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-4 px-4 text-gray-900 font-medium">{suporte.cliente_nome}</td>
                  <td className="py-4 px-4 text-gray-700 capitalize">{suporte.tipo}</td>
                  <td className="py-4 px-4 text-gray-700">{suporte.tecnico || '-'}</td>
                  <td className="py-4 px-4 text-gray-700">
                    <span className="truncate max-w-xs block" title={suporte.descricao}>
                      {suporte.descricao}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(suporte.status)}`}>
                      {getStatusLabel(suporte.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setViewingSuporte(suporte)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSuportes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum suporte encontrado</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && <SuporteModal onClose={() => setModalOpen(false)} onSave={handleSave} />}

      {viewingSuporte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Detalhes do Suporte</h2>
              <button
                onClick={() => setViewingSuporte(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Search className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="text-lg font-semibold text-gray-900">{viewingSuporte.cliente_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Data/Hora</p>
                  <p className="text-gray-900">
                    {new Date(viewingSuporte.data_suporte).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="text-gray-900 capitalize">{viewingSuporte.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Técnico</p>
                  <p className="text-gray-900">{viewingSuporte.tecnico || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingSuporte.status)}`}>
                    {getStatusLabel(viewingSuporte.status)}
                  </span>
                </div>
              </div>
              {viewingSuporte.solicitante_nome && (
                <div>
                  <p className="text-sm text-gray-600">Solicitante</p>
                  <p className="text-gray-900">{viewingSuporte.solicitante_nome}</p>
                  <p className="text-sm text-gray-600">{viewingSuporte.solicitante_email}</p>
                  {viewingSuporte.solicitante_departamento && (
                    <p className="text-sm text-gray-600">{viewingSuporte.solicitante_departamento}</p>
                  )}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="text-gray-900 whitespace-pre-wrap">{viewingSuporte.descricao}</p>
              </div>
              {viewingSuporte.print_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Print</p>
                  <img src={viewingSuporte.print_url} alt="Print" className="max-w-full rounded-lg border border-gray-300" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
