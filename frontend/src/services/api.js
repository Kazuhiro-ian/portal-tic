const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const TOKEN_STORAGE_KEY = 'ithub_token';

let onUnauthorized = null;

/** Registrado pelo AuthContext para saber quando forçar logout (token ausente/expirado/revogado). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    let mensagem = `Erro ${response.status} ao comunicar com o servidor.`;
    try {
      const body = await response.json();
      if (body && body.mensagem) mensagem = body.mensagem;
    } catch {
      // resposta sem corpo JSON, mantém mensagem genérica
    }
    throw new Error(mensagem);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const apiGet = (path) => apiFetch(path);
const apiPost = (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) });
const apiPut = (path, data) => apiFetch(path, { method: 'PUT', body: JSON.stringify(data) });
const apiPatch = (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) });
const apiDelete = (path) => apiFetch(path, { method: 'DELETE' });

// --- AUTENTICAÇÃO ---
export const login = (username, password) => apiPost('/api/auth/login', { username, password });

// --- USUÁRIOS (gestão, somente ADMIN) ---
export const listarUsuarios = () => apiGet('/api/usuarios');
export const salvarUsuario = (data) => apiPost('/api/usuarios', data);
export const atualizarUsuario = (id, data) => apiPut(`/api/usuarios/${id}`, data);
export const desativarUsuario = (id) => apiDelete(`/api/usuarios/${id}`);

// --- ROTAS DE FILIAIS ---
export const listarFiliais = () => apiGet('/api/filiais');
export const salvarFilial = (filialData) => apiPost('/api/filiais', filialData);
export const atualizarFilial = (id, filialData) => apiPut(`/api/filiais/${id}`, filialData);
export const deletarFilial = (id) => apiDelete(`/api/filiais/${id}`);

// --- ROTAS DE IMPRESSORAS ---
export const listarImpressoras = () => apiGet('/api/impressoras');
export const salvarImpressora = (printerData) => apiPost('/api/impressoras', printerData);
export const atualizarImpressora = (id, printerData) => apiPut(`/api/impressoras/${id}`, printerData);
export const deletarImpressora = (id) => apiDelete(`/api/impressoras/${id}`);

// --- ROTAS DE LINKS UTEIS ---
export const listarLinks = () => apiGet('/api/links');
export const salvarLink = (linkData) => apiPost('/api/links', linkData);
export const atualizarLink = (id, linkData) => apiPut(`/api/links/${id}`, linkData);
export const deletarLink = (id) => apiDelete(`/api/links/${id}`);

// --- ROTAS DE ESTOQUE (ITENS) ---
export const listarEstoqueItens = () => apiGet('/api/estoque/itens');
export const salvarEstoqueItem = (itemData) => apiPost('/api/estoque/itens', itemData);
export const atualizarEstoqueItem = (id, itemData) => apiPut(`/api/estoque/itens/${id}`, itemData);
export const deletarEstoqueItem = (id) => apiDelete(`/api/estoque/itens/${id}`);

// --- ROTAS DE ESTOQUE (MOVIMENTAÇÕES) ---
export const listarMovimentos = () => apiGet('/api/estoque/movimentos');
export const salvarMovimento = (movimentoData) => apiPost('/api/estoque/movimentos', movimentoData);

// --- ROTAS DE COLABORADORES ---
export const listarColaboradores = () => apiGet('/api/colaboradores');
export const salvarColaborador = (colaboradorData) => apiPost('/api/colaboradores', colaboradorData);
export const atualizarColaborador = (id, colaboradorData) => apiPut(`/api/colaboradores/${id}`, colaboradorData);
export const deletarColaborador = (id) => apiDelete(`/api/colaboradores/${id}`);

// --- ROTAS DE ESCALAS ---
export const listarEscalasPorPeriodo = (inicio, fim) =>
  apiGet(`/api/escalas?inicio=${inicio}&fim=${fim}`);
export const salvarEscalaDia = (escalaData) => apiPost('/api/escalas', escalaData);

// --- ROTAS DE TAREFAS DE PLANTÃO ---
export const listarTarefasPorData = (dataYYYYMMDD) =>
  apiGet(`/api/tarefas-plantao?data=${dataYYYYMMDD}`);
export const salvarTarefaPlantao = (tarefaData) => apiPost('/api/tarefas-plantao', tarefaData);
export const atualizarStatusTarefa = (id, novoStatus) => apiPatch(`/api/tarefas-plantao/${id}/status`, novoStatus);
export const deletarTarefaPlantao = (id) => apiDelete(`/api/tarefas-plantao/${id}`);

// --- ROTAS DE ARTIGOS (BASE DE CONHECIMENTO) ---
export const listarArtigos = () => apiGet('/api/artigos');
export const salvarArtigo = (artigoData) => apiPost('/api/artigos', artigoData);
export const atualizarArtigo = (id, artigoData) => apiPut(`/api/artigos/${id}`, artigoData);
export const deletarArtigo = (id) => apiDelete(`/api/artigos/${id}`);

// --- ROTAS DE CREDENCIAIS ---
export const listarCredenciais = () => apiGet('/api/credenciais');
export const salvarCredencial = (credData) => apiPost('/api/credenciais', credData);
export const atualizarCredencial = (id, credData) => apiPut(`/api/credenciais/${id}`, credData);
export const deletarCredencial = (id) => apiDelete(`/api/credenciais/${id}`);

// --- ROTAS DE COTAS ZEBRA ---
export const listarZebraCotas = () => apiGet('/api/zebra-cotas');
export const salvarZebraCota = (cotaData) => apiPost('/api/zebra-cotas', cotaData);
export const atualizarZebraCota = (id, cotaData) => apiPut(`/api/zebra-cotas/${id}`, cotaData);
export const deletarZebraCota = (id) => apiDelete(`/api/zebra-cotas/${id}`);

// --- ROTAS DE ENVIOS ZEBRA ---
export const listarZebraEnvios = () => apiGet('/api/zebra-envios');
export const salvarZebraEnvio = (envioData) => apiPost('/api/zebra-envios', envioData);
export const deletarZebraEnvio = (id) => apiDelete(`/api/zebra-envios/${id}`);
