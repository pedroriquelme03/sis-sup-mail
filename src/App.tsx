import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import ClienteDetalhes from './components/ClienteDetalhes';
import Suportes from './components/Suportes';
import SolicitacaoPublica from './components/SolicitacaoPublica';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const suporteMatch = path.match(/^\/suporte\/(.+)$/);

    if (suporteMatch) {
      setPublicSlug(suporteMatch[1]);
    }
  }, []);

  if (publicSlug) {
    return <SolicitacaoPublica slug={publicSlug} />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleSelectCliente = (clienteId: number) => {
    setSelectedClienteId(clienteId);
    setCurrentPage('cliente-detalhes');
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setSelectedClienteId(null);
  };

  const renderPage = () => {
    if (currentPage === 'cliente-detalhes' && selectedClienteId) {
      return (
        <ClienteDetalhes
          clienteId={selectedClienteId}
          onBack={() => setCurrentPage('clientes')}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clientes':
        return <Clientes onSelectCliente={handleSelectCliente} />;
      case 'suportes':
        return <Suportes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
