import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, Eye } from 'lucide-react';
import { Cliente } from '../types';
import ClienteModal from './ClienteModal';

interface ClientesProps {
  onSelectCliente: (clienteId: number) => void;
}

export default function Clientes({ onSelectCliente }: ClientesProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    const filtered = clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj?.includes(searchTerm) ||
      cliente.contato_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClientes(filtered);
  }, [searchTerm, clientes]);

  const loadClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      const data = await response.json();
      setClientes(data);
      setFilteredClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadClientes();
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditingCliente(null);
    loadClientes();
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
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie seus clientes corporativos</p>
        </div>
        <button
          onClick={() => {
            setEditingCliente(null);
            setModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Cliente</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">CNPJ</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Contato</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Mensalidade</th>
                <th className="text-right py-3 px-4 text-gray-700 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{cliente.nome}</p>
                      {cliente.observacoes && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{cliente.observacoes}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">{cliente.cnpj || '-'}</td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <p className="text-gray-900">{cliente.contato_nome || '-'}</p>
                      <p className="text-gray-500">{cliente.contato_email || '-'}</p>
                      <p className="text-gray-500">{cliente.contato_telefone || '-'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {cliente.valor_mensalidade
                      ? `R$ ${Number(cliente.valor_mensalidade).toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectCliente(cliente.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCliente(cliente);
                          setModalOpen(true);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClientes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ClienteModal
          cliente={editingCliente}
          onClose={() => {
            setModalOpen(false);
            setEditingCliente(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
