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

// --- ROTAS DE COLABORADORES ---
const BASE_URL_COLABORADORES = 'http://172.128.100.104:8080/api/colaboradores';

export const listarColaboradores = async () => {
  const response = await fetch(BASE_URL_COLABORADORES);
  if (!response.ok) throw new Error('Erro ao buscar colaboradores.');
  return await response.json();
};

export const salvarColaborador = async (colaboradorData) => {
  const response = await fetch(BASE_URL_COLABORADORES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colaboradorData),
  });
  if (!response.ok) throw new Error('Erro ao salvar colaborador.');
  return await response.json();
};

export const atualizarColaborador = async (id, colaboradorData) => {
  const response = await fetch(`${BASE_URL_COLABORADORES}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colaboradorData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar colaborador.');
  return await response.json();
};

export const deletarColaborador = async (id) => {
  const response = await fetch(`${BASE_URL_COLABORADORES}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar colaborador.');
};

// --- ROTAS DE ESCALAS ---
const BASE_URL_ESCALAS = 'http://172.128.100.104:8080/api/escalas';

export const listarEscalasPorPeriodo = async (inicio, fim) => {
  const response = await fetch(`${BASE_URL_ESCALAS}?inicio=${inicio}&fim=${fim}`);
  if (!response.ok) throw new Error('Erro ao buscar escalas do período.');
  return await response.json();
};

export const salvarEscalaDia = async (escalaData) => {
  const response = await fetch(BASE_URL_ESCALAS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(escalaData),
  });
  if (!response.ok) throw new Error('Erro ao salvar escala.');
  return await response.json();
};

// --- ROTAS DE TAREFAS DE PLANTÃO ---
const BASE_URL_TAREFAS = 'http://172.128.100.104:8080/api/tarefas-plantao';

export const listarTarefasPorData = async (dataYYYYMMDD) => {
  const response = await fetch(`${BASE_URL_TAREFAS}?data=${dataYYYYMMDD}`);
  if (!response.ok) throw new Error('Erro ao buscar tarefas do plantão.');
  return await response.json();
};

export const salvarTarefaPlantao = async (tarefaData) => {
  const response = await fetch(BASE_URL_TAREFAS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tarefaData),
  });
  if (!response.ok) throw new Error('Erro ao criar tarefa.');
  return await response.json();
};

export const atualizarStatusTarefa = async (id, novoStatus) => {
  const response = await fetch(`${BASE_URL_TAREFAS}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoStatus),
  });
  if (!response.ok) throw new Error('Erro ao atualizar status da tarefa.');
  return await response.json();
};

export const deletarTarefaPlantao = async (id) => {
  const response = await fetch(`${BASE_URL_TAREFAS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar tarefa.');
};

// --- ROTAS DE ARTIGOS (BASE DE CONHECIMENTO) ---
const BASE_URL_ARTIGOS = 'http://172.128.100.104:8080/api/artigos';

export const listarArtigos = async () => {
  const response = await fetch(BASE_URL_ARTIGOS);
  if (!response.ok) throw new Error('Erro ao buscar artigos.');
  return await response.json();
};

export const salvarArtigo = async (artigoData) => {
  const response = await fetch(BASE_URL_ARTIGOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artigoData),
  });
  if (!response.ok) throw new Error('Erro ao salvar artigo.');
  return await response.json();
};

export const atualizarArtigo = async (id, artigoData) => {
  const response = await fetch(`${BASE_URL_ARTIGOS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artigoData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar artigo.');
  return await response.json();
};

export const deletarArtigo = async (id) => {
  const response = await fetch(`${BASE_URL_ARTIGOS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar artigo.');
};

// --- ROTAS DE CREDENCIAIS ---
const BASE_URL_CREDENCIAIS = 'http://172.128.100.104:8080/api/credenciais';

export const listarCredenciais = async () => {
  const response = await fetch(BASE_URL_CREDENCIAIS);
  if (!response.ok) throw new Error('Erro ao buscar credenciais.');
  return await response.json();
};

export const salvarCredencial = async (credData) => {
  const response = await fetch(BASE_URL_CREDENCIAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credData),
  });
  if (!response.ok) throw new Error('Erro ao salvar credencial.');
  return await response.json();
};

export const atualizarCredencial = async (id, credData) => {
  const response = await fetch(`${BASE_URL_CREDENCIAIS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar credencial.');
  return await response.json();
};

export const deletarCredencial = async (id) => {
  const response = await fetch(`${BASE_URL_CREDENCIAIS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar credencial.');
};

// --- ROTAS DE COTAS ZEBRA ---
const BASE_URL_ZEBRA_COTAS = 'http://172.128.100.104:8080/api/zebra-cotas';

export const listarZebraCotas = async () => {
  const response = await fetch(BASE_URL_ZEBRA_COTAS);
  if (!response.ok) throw new Error('Erro ao buscar cotas Zebra.');
  return await response.json();
};

export const salvarZebraCota = async (cotaData) => {
  const response = await fetch(BASE_URL_ZEBRA_COTAS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cotaData),
  });
  if (!response.ok) throw new Error(await response.text() || 'Erro ao salvar cota.');
  return await response.json();
};

export const atualizarZebraCota = async (id, cotaData) => {
  const response = await fetch(`${BASE_URL_ZEBRA_COTAS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cotaData),
  });
  if (!response.ok) throw new Error(await response.text() || 'Erro ao atualizar cota.');
  return await response.json();
};

export const deletarZebraCota = async (id) => {
  const response = await fetch(`${BASE_URL_ZEBRA_COTAS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar cota.');
};

// --- ROTAS DE ENVIOS ZEBRA ---
const BASE_URL_ZEBRA_ENVIOS = 'http://172.128.100.104:8080/api/zebra-envios';

export const listarZebraEnvios = async () => {
  const response = await fetch(BASE_URL_ZEBRA_ENVIOS);
  if (!response.ok) throw new Error('Erro ao buscar envios Zebra.');
  return await response.json();
};

export const salvarZebraEnvio = async (envioData) => {
  const response = await fetch(BASE_URL_ZEBRA_ENVIOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envioData),
  });
  if (!response.ok) throw new Error(await response.text() || 'Erro ao registrar envio.');
  return await response.json();
};

export const deletarZebraEnvio = async (id) => {
  const response = await fetch(`${BASE_URL_ZEBRA_ENVIOS}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar envio.');
};