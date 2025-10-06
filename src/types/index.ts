export interface Cliente {
  id: number;
  nome: string;
  cnpj?: string;
  contato_nome?: string;
  contato_email?: string;
  contato_telefone?: string;
  observacoes?: string;
  valor_mensalidade?: number;
  url_slug?: string;
  criado_em?: string;
}

export interface Email {
  id: number;
  cliente_id: number;
  email: string;
  usuario?: string;
  cargo?: string;
  departamento?: string;
  objetivo?: string;
  em_uso: boolean;
  criado_em?: string;
}

export interface Suporte {
  id: number;
  cliente_id: number;
  cliente_nome?: string;
  tecnico?: string;
  tipo: string;
  descricao: string;
  print_url?: string;
  data_suporte: string;
  tempo_gasto?: number;
  solicitante_nome?: string;
  solicitante_email?: string;
  solicitante_departamento?: string;
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
}

export interface DashboardStats {
  totalClientes: number;
  suportesMes: number;
  clientesAtivos: number;
  tiposSuporte: { tipo: string; total: number }[];
}
