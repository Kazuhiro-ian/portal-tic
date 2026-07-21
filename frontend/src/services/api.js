// --- ROTAS DE FILIAIS ---
const BASE_URL_FILIAIS = 'http://172.128.100.104:8080/api/filiais'; 

export const listarFiliais = async () => {
  const response = await fetch(BASE_URL_FILIAIS);
  if (!response.ok) throw new Error('Erro ao buscar filiais.');
  return await response.json();
};

export const salvarFilial = async (filialData) => {
  const response = await fetch(BASE_URL_FILIAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filialData),
  });
  if (!response.ok) throw new Error('Erro ao salvar no banco de dados.');
  return await response.json();
};

export const atualizarFilial = async (id, filialData) => {
  const response = await fetch(`${BASE_URL_FILIAIS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filialData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar no banco de dados.');
  return await response.json();
};

export const deletarFilial = async (id) => {
  const response = await fetch(`${BASE_URL_FILIAIS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar no banco de dados.');
};


// --- ROTAS DE IMPRESSORAS ---
const BASE_URL_IMPRESSORAS = 'http://172.128.100.104:8080/api/impressoras';

export const listarImpressoras = async () => {
  const response = await fetch(BASE_URL_IMPRESSORAS);
  if (!response.ok) throw new Error('Erro ao buscar impressoras.');
  return await response.json();
};

export const salvarImpressora = async (printerData) => {
  const response = await fetch(BASE_URL_IMPRESSORAS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(printerData),
  });
  if (!response.ok) throw new Error('Erro ao salvar impressora.');
  return await response.json();
};

export const atualizarImpressora = async (id, printerData) => {
  const response = await fetch(`${BASE_URL_IMPRESSORAS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(printerData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar impressora.');
  return await response.json();
};

export const deletarImpressora = async (id) => {
  const response = await fetch(`${BASE_URL_IMPRESSORAS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar impressora.');
};


// --- ROTAS DE LINKS UTEIS ---
const BASE_URL_LINKS = 'http://172.128.100.104:8080/api/links';

export const listarLinks = async () => {
  const response = await fetch(BASE_URL_LINKS);
  if (!response.ok) throw new Error('Erro ao buscar links.');
  return await response.json();
};

export const salvarLink = async (linkData) => {
  const response = await fetch(BASE_URL_LINKS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkData),
  });
  if (!response.ok) throw new Error('Erro ao salvar link.');
  return await response.json();
};

export const atualizarLink = async (id, linkData) => {
  const response = await fetch(`${BASE_URL_LINKS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar link.');
  return await response.json();
};

export const deletarLink = async (id) => {
  const response = await fetch(`${BASE_URL_LINKS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar link.');
};

// --- ROTAS DE ESTOQUE (ITENS) ---
const BASE_URL_ESTOQUE_ITENS = 'http://172.128.100.104:8080/api/estoque/itens';

export const listarEstoqueItens = async () => {
  const response = await fetch(BASE_URL_ESTOQUE_ITENS);
  if (!response.ok) throw new Error('Erro ao buscar itens de estoque.');
  return await response.json();
};

export const salvarEstoqueItem = async (itemData) => {
  const response = await fetch(BASE_URL_ESTOQUE_ITENS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) throw new Error('Erro ao salvar item de estoque.');
  return await response.json();
};

export const atualizarEstoqueItem = async (id, itemData) => {
  const response = await fetch(`${BASE_URL_ESTOQUE_ITENS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar item de estoque.');
  return await response.json();
};

export const deletarEstoqueItem = async (id) => {
  const response = await fetch(`${BASE_URL_ESTOQUE_ITENS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar item de estoque.');
};

// --- ROTAS DE ESTOQUE (MOVIMENTAÇÕES) ---
const BASE_URL_ESTOQUE_MOVIMENTOS = 'http://172.128.100.104:8080/api/estoque/movimentos';

export const listarMovimentos = async () => {
  const response = await fetch(BASE_URL_ESTOQUE_MOVIMENTOS);
  if (!response.ok) throw new Error('Erro ao buscar histórico de movimentações.');
  return await response.json();
};

export const salvarMovimento = async (movimentoData) => {
  const response = await fetch(BASE_URL_ESTOQUE_MOVIMENTOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(movimentoData),
  });
  if (!response.ok) throw new Error('Erro ao registrar movimentação.');
  return await response.json();
};