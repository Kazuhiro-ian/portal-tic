const BASE_URL = 'http://172.128.100.104:8080/api/filiais'; // Mantenha o IP da sua rede ou localhost

export const listarFiliais = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error('Erro ao buscar filiais.');
  return await response.json();
};

export const salvarFilial = async (filialData) => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filialData),
  });
  if (!response.ok) throw new Error('Erro ao salvar no banco de dados.');
  return await response.json();
};

// NOVO: Função para atualizar (PUT)
export const atualizarFilial = async (id, filialData) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filialData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar no banco de dados.');
  return await response.json();
};

// NOVO: Função para excluir (DELETE)
export const deletarFilial = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar no banco de dados.');
};