import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Search, CreditCard as Edit, Trash2, Mail, User, Briefcase, Building2, Target, CheckCircle, XCircle, Download, Upload } from 'lucide-react';
import { Cliente, Email } from '../types';
import EmailModal from './EmailModal';

interface ClienteDetalhesProps {
  clienteId: number;
  onBack: () => void;
}

export default function ClienteDetalhes({ clienteId, onBack }: ClienteDetalhesProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);

  useEffect(() => {
    loadCliente();
    loadEmails();
  }, [clienteId]);

  useEffect(() => {
    const filtered = emails.filter(email =>
      email.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmails(filtered);
  }, [searchTerm, emails]);

  const loadCliente = async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}`);
      const data = await response.json();
      setCliente(data);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/emails`);
      const data = await response.json();
      setEmails(data);
      setFilteredEmails(data);
    } catch (error) {
      console.error('Erro ao carregar e-mails:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este e-mail?')) return;

    try {
      const response = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadEmails();
      }
    } catch (error) {
      console.error('Erro ao excluir e-mail:', error);
    }
  };

  const handleToggleEmUso = async (email: Email) => {
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...email, em_uso: !email.em_uso })
      });
      if (response.ok) {
        loadEmails();
      }
    } catch (error) {
      console.error('Erro ao atualizar e-mail:', error);
    }
  };

  const exportEmails = () => {
    if (emails.length === 0) {
      alert('Não há emails para exportar.');
      return;
    }

    const csvContent = [
      // Cabeçalho
      ['Email', 'Usuário', 'Cargo', 'Departamento', 'Objetivo', 'Em Uso'].join(','),
      // Dados
      ...emails.map(email => [
        email.email,
        email.usuario || '',
        email.cargo || '',
        email.departamento || '',
        email.objetivo || '',
        email.em_uso ? 'Sim' : 'Não'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${cliente?.nome || 'cliente'}_emails.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importEmails = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          alert('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const expectedHeaders = ['Email', 'Usuário', 'Cargo', 'Departamento', 'Objetivo', 'Em Uso'];
        
        if (!expectedHeaders.every(header => headers.includes(header))) {
          alert('Cabeçalhos do CSV devem ser: Email, Usuário, Cargo, Departamento, Objetivo, Em Uso');
          return;
        }

        const emailsToImport: Partial<Email>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          if (values.length >= 6 && values[0]) { // Email é obrigatório
            emailsToImport.push({
              email: values[0],
              usuario: values[1] || '',
              cargo: values[2] || '',
              departamento: values[3] || '',
              objetivo: values[4] || '',
              em_uso: values[5].toLowerCase() === 'sim' || values[5].toLowerCase() === 'true' || values[5] === '1'
            });
          }
        }

        if (emailsToImport.length === 0) {
          alert('Nenhum email válido encontrado no arquivo.');
          return;
        }

        if (confirm(`Deseja importar ${emailsToImport.length} emails?`)) {
          importEmailsToDatabase(emailsToImport);
        }
      } catch (error) {
        console.error('Erro ao processar arquivo CSV:', error);
        alert('Erro ao processar arquivo CSV. Verifique o formato.');
      }
    };
    reader.readAsText(file);
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  const importEmailsToDatabase = async (emailsToImport: Partial<Email>[]) => {
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const emailData of emailsToImport) {
        try {
          const response = await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...emailData, cliente_id: clienteId })
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        loadEmails(); // Recarregar a lista
        alert(`Importação concluída!\nSucessos: ${successCount}\nErros: ${errorCount}`);
      } else {
        alert('Nenhum email foi importado. Verifique os dados.');
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro durante a importação.');
    }
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditingEmail(null);
    loadEmails();
  };

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Clientes
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{cliente.nome}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cliente.cnpj && (
              <div>
                <p className="text-sm text-gray-600">CNPJ</p>
                <p className="text-gray-900 font-medium">{cliente.cnpj}</p>
              </div>
            )}
            {cliente.contato_nome && (
              <div>
                <p className="text-sm text-gray-600">Contato</p>
                <p className="text-gray-900 font-medium">{cliente.contato_nome}</p>
              </div>
            )}
            {cliente.contato_email && (
              <div>
                <p className="text-sm text-gray-600">E-mail</p>
                <p className="text-gray-900 font-medium">{cliente.contato_email}</p>
              </div>
            )}
            {cliente.contato_telefone && (
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="text-gray-900 font-medium">{cliente.contato_telefone}</p>
              </div>
            )}
            {cliente.valor_mensalidade && (
              <div>
                <p className="text-sm text-gray-600">Mensalidade</p>
                <p className="text-gray-900 font-medium">R$ {Number(cliente.valor_mensalidade).toFixed(2)}</p>
              </div>
            )}
            {cliente.url_slug && (
              <div>
                <p className="text-sm text-gray-600">URL de Suporte</p>
                <p className="text-gray-900 font-medium">/{cliente.url_slug}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">E-mails Gerenciados</h2>
          <div className="flex gap-3">
            <button
              onClick={exportEmails}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              title="Exportar emails para CSV"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>
            <label className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              Importar
              <input
                type="file"
                accept=".csv"
                onChange={importEmails}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setEditingEmail(null);
                setModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar E-mail
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por e-mail, usuário ou departamento..."
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
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Usuário
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Cargo
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Departamento
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Objetivo
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">Em Uso</th>
                <th className="text-right py-3 px-4 text-gray-700 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((email) => (
                <tr key={email.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{email.email}</td>
                  <td className="py-4 px-4 text-gray-700">{email.usuario || '-'}</td>
                  <td className="py-4 px-4 text-gray-700">{email.cargo || '-'}</td>
                  <td className="py-4 px-4 text-gray-700">{email.departamento || '-'}</td>
                  <td className="py-4 px-4 text-gray-700">
                    <span className="truncate max-w-xs block" title={email.objetivo || '-'}>
                      {email.objetivo || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleEmUso(email)}
                      className="mx-auto block"
                    >
                      {email.em_uso ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingEmail(email);
                          setModalOpen(true);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(email.id)}
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

          {filteredEmails.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum e-mail cadastrado</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <EmailModal
          email={editingEmail}
          clienteId={clienteId}
          onClose={() => {
            setModalOpen(false);
            setEditingEmail(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
