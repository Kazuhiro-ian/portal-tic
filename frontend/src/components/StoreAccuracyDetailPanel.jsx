import { useState, useEffect, useCallback } from 'react';
import { ArrowDown, ArrowUp, ArrowLeftRight, Layers, Store, Warehouse, ExternalLink } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { ListaRanking } from './ListaRanking.jsx';
import { ResultadoArmazemCard } from './ResultadoArmazemCard.jsx';
import { buscarDetalheFilialAcuracidade, buscarConfiguracaoQualidade } from '../services/api.js';
import { unidade } from '../utils/formato.js';

function rodapeImportacao(titulo, resumo) {
  if (!resumo) return null;
  return (
    <p className="text-xs text-dark-400">
      {titulo}: {resumo.arquivoNome || (resumo.status === 'REALIZADO' ? 'sem arquivo' : 'não importado')}
      {resumo.importadoPor && ` · importado por ${resumo.importadoPor}`}
      {resumo.importadoEm && ` em ${new Date(resumo.importadoEm).toLocaleString('pt-BR')}`}
    </p>
  );
}

export function StoreAccuracyDetailPanel({ filialId, nomeFilial, ano, mes, onClose, showToast }) {
  const [detalhe, setDetalhe] = useState(null);
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!filialId) return;
    try {
      setCarregando(true);
      const [dadosDetalhe, dadosConfig] = await Promise.all([
        buscarDetalheFilialAcuracidade(filialId, ano, mes),
        buscarConfiguracaoQualidade(),
      ]);
      setDetalhe(dadosDetalhe);
      setConfig(dadosConfig);
    } catch (erro) {
      showToast(erro.message || 'Erro ao carregar o detalhe da filial.', 'error');
    } finally {
      setCarregando(false);
    }
  }, [filialId, ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirDashboard = () => {
    window.open(`/qualidade/acuracidade/loja/${filialId}?ano=${ano}&mes=${mes}`, '_blank');
  };

  return (
    <SidePanel
      isOpen={!!filialId}
      onClose={onClose}
      title={`Acuracidade — ${nomeFilial}`}
      size={detalhe?.estoqueDividido ? 'xl' : 'lg'}
    >
      {carregando ? (
        <p className="text-dark-400 text-center py-12">Carregando...</p>
      ) : !detalhe ? null : (
        <div className="space-y-5">
          <button onClick={abrirDashboard} className="btn-secondary w-full justify-center">
            <ExternalLink className="w-4 h-4" />
            Ver dashboard completo (gráficos)
          </button>

          {/* "Geral" em linha própria (é o número principal); Loja/Estoque comparados lado a
              lado embaixo. Cabem 3 cards completos apertados demais num painel lateral --
              esse empilhamento em 2 níveis usa o espaço sem cortar nenhuma informação. */}
          <ResultadoArmazemCard
            titulo="Geral" icon={Layers}
            resultado={detalhe.geral?.atual} anterior={detalhe.geral?.anterior} config={config}
          />
          {detalhe.estoqueDividido && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultadoArmazemCard
                titulo="Loja" icon={Store}
                resultado={detalhe.armazem01?.atual} anterior={detalhe.armazem01?.anterior} config={config}
              />
              <ResultadoArmazemCard
                titulo="Estoque" icon={Warehouse}
                resultado={detalhe.armazem03?.atual} anterior={detalhe.armazem03?.anterior} config={config}
              />
            </div>
          )}

          {detalhe.estoqueDividido && detalhe.divergenciasCruzadas?.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <h3 className="font-semibold text-amber-200 mb-2 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Possíveis transferências entre estoques
              </h3>
              <p className="text-xs text-amber-200/80 mb-3">
                Produtos com sobra num armazém e falta exatamente igual no outro. Não altera o
                percentual de acuracidade — é só um alerta para revisar a movimentação.
              </p>
              <div className="space-y-2">
                {detalhe.divergenciasCruzadas.map((d) => (
                  <div key={d.codProduto} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-dark-800/60 border border-dark-600">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{d.descricao || d.codProduto}</p>
                      <p className="text-xs text-dark-400">{d.codProduto}</p>
                    </div>
                    <p className="text-xs text-right shrink-0">
                      <span className="text-dark-300">Loja: </span>
                      <span className={Number(d.divergenciaLoja) > 0 ? 'text-green-400' : 'text-red-400'}>
                        {unidade(d.divergenciaLoja)}
                      </span>
                      <span className="text-dark-300"> · Estoque: </span>
                      <span className={Number(d.divergenciaEstoque) > 0 ? 'text-green-400' : 'text-red-400'}>
                        {unidade(d.divergenciaEstoque)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListaRanking titulo="Maiores Faltas" icon={ArrowDown} cor="text-red-400" itens={detalhe.maioresFaltas} />
            <ListaRanking titulo="Maiores Sobras" icon={ArrowUp} cor="text-green-400" itens={detalhe.maioresSobras} />
          </div>

          <div className="space-y-1 pt-3 border-t border-dark-700">
            {rodapeImportacao(detalhe.estoqueDividido ? 'Loja' : 'Inventário', detalhe.inventarioArmazem01)}
            {detalhe.estoqueDividido && rodapeImportacao('Estoque', detalhe.inventarioArmazem03)}
          </div>
        </div>
      )}
    </SidePanel>
  );
}
