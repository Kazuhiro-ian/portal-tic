import { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import {
  importarResultadoInventario, buscarResultadoInventario,
  removerResultadoInventario, buscarConfiguracaoQualidade,
} from '../services/api.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { percentual, moeda, inteiro, unidade } from '../utils/formato.js';

/** Indicador grande com cor de semáforo conforme bate ou não a meta. */
function Indicador({ titulo, valor, meta, atingiu, descricaoMeta }) {
  const cor = atingiu == null ? 'text-white' : atingiu ? 'text-green-400' : 'text-red-400';
  return (
    <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-600">
      <p className="text-xs text-dark-400 uppercase tracking-wider">{titulo}</p>
      <p className={`text-3xl font-bold mt-1 ${cor}`}>{valor}</p>
      {meta && <p className="text-xs text-dark-400 mt-1">{descricaoMeta} {meta}</p>}
    </div>
  );
}

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-700/50 last:border-b-0">
      <span className="text-sm text-dark-400">{rotulo}</span>
      <span className={`text-sm text-right ${destaque || 'text-dark-100'}`}>{valor}</span>
    </div>
  );
}

/**
 * Upload + resultado de um armazém específico do inventário (ou do inventário inteiro, quando
 * `armazem` é null e a filial não é dividida). Cada bloco busca/importa/remove de forma
 * independente -- numa filial dividida, os dois armazéns do mesmo dia vivem lado a lado aqui.
 */
function BlocoImportacao({ inventarioId, armazem, titulo, canWrite, config, confirmar, onImportado, showToast }) {
  const [resultado, setResultado] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const dados = await buscarResultadoInventario(inventarioId, armazem);
      setResultado(dados);
    } catch (erro) {
      showToast(erro.message || 'Erro ao carregar o resultado do inventário.', 'error');
    } finally {
      setCarregando(false);
    }
  }, [inventarioId, armazem, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleImportar = async () => {
    if (!arquivo) {
      showToast('Selecione o arquivo do relatório antes de importar.', 'error');
      return;
    }
    try {
      setImportando(true);
      const novo = await importarResultadoInventario(inventarioId, arquivo, armazem);
      setResultado(novo);
      setArquivo(null);
      showToast('Relatório importado. O inventário foi marcado como realizado.');
      if (onImportado) onImportado();
    } catch (erro) {
      showToast(erro.message || 'Erro ao importar o relatório.', 'error');
    } finally {
      setImportando(false);
    }
  };

  const handleRemover = async () => {
    const confirmado = await confirmar({
      titulo: 'Remover resultado',
      mensagem: `Isso apaga os produtos importados e os indicadores calculados${titulo ? ` de ${titulo}` : ' deste inventário'}. Deseja continuar?`,
    });
    if (!confirmado) return;

    try {
      await removerResultadoInventario(inventarioId, armazem);
      setResultado(null);
      showToast('Resultado removido.');
      if (onImportado) onImportado();
    } catch (erro) {
      showToast(erro.message || 'Erro ao remover o resultado.', 'error');
    }
  };

  const atingiuAcuracidade = resultado && config
    ? Number(resultado.percentualAcuracidade) >= Number(config.metaAcuracidade)
    : null;
  // Ajuste é "quanto menor melhor": a meta é um teto, não um piso.
  const atingiuAjuste = resultado && config
    ? Number(resultado.percentualInacuracia) <= Number(config.metaInacuracia)
    : null;

  if (carregando) {
    return <p className="text-dark-400 text-center py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-5">
      {titulo && <h3 className="font-semibold text-white">{titulo}</h3>}

      {!resultado && (
        <div className="p-6 rounded-xl border border-dashed border-dark-600 text-center">
          <FileSpreadsheet className="w-10 h-10 text-dark-400 mx-auto mb-3" />
          <p className="text-dark-300 text-sm">
            Nenhum relatório importado {titulo ? `para ${titulo}` : 'para este inventário'}.
          </p>
          <p className="text-dark-400 text-xs mt-1">
            Envie o relatório de conferência exportado do Protheus (.xml){titulo ? ' desse armazém' : ' desta filial'}.
          </p>
        </div>
      )}

      {resultado && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Indicador
              titulo="Acuracidade"
              valor={percentual(resultado.percentualAcuracidade)}
              meta={config ? percentual(config.metaAcuracidade) : null}
              descricaoMeta="Meta: mínimo"
              atingiu={atingiuAcuracidade}
            />
            <Indicador
              titulo="Ajuste (R$)"
              valor={percentual(resultado.percentualInacuracia)}
              meta={config ? percentual(config.metaInacuracia) : null}
              descricaoMeta="Meta: máximo"
              atingiu={atingiuAjuste}
            />
          </div>

          {resultado.considerouZerados === false && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                Inventário com mais de {inteiro(config?.limiteZerados)} produtos: os itens
                zerados não foram contados como acurados, seguindo a regra usada na planilha.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Valores</h4>
              <Linha rotulo="Estoque inicial" valor={moeda(resultado.estoqueInicialValor)} />
              <Linha rotulo="Estoque final" valor={moeda(resultado.estoqueFinalValor)} />
              <Linha rotulo="Falta" valor={moeda(resultado.perdaValor)} destaque="text-red-400" />
              <Linha rotulo="Sobra" valor={moeda(resultado.ganhoValor)} destaque="text-green-400" />
              <Linha rotulo="Total de ajuste" valor={moeda(resultado.totalAjusteValor)} />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Produtos</h4>
              <Linha rotulo="Total no relatório" valor={inteiro(resultado.totalProdutos)} />
              <Linha rotulo="Contados" valor={inteiro(resultado.produtosContados)} />
              <Linha rotulo="Zerados" valor={inteiro(resultado.produtosZerados)} />
              <Linha rotulo="Acurados" valor={inteiro(resultado.produtosAcurados)} destaque="text-green-400" />
              <Linha rotulo="Inacurados" valor={inteiro(resultado.produtosInacurados)} destaque="text-red-400" />
              <Linha rotulo="Com falta / com sobra"
                valor={`${inteiro(resultado.produtosComPerda)} / ${inteiro(resultado.produtosComGanho)}`} />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Unidades</h4>
              <Linha rotulo="Quantidade inicial" valor={unidade(resultado.quantidadeInicial)} />
              <Linha rotulo="Quantidade final" valor={unidade(resultado.quantidadeFinal)} />
              <Linha rotulo="Falta (un.)" valor={unidade(resultado.unidadesPerda)} destaque="text-red-400" />
              <Linha rotulo="Sobra (un.)" valor={unidade(resultado.unidadesGanho)} destaque="text-green-400" />
            </div>
          </div>

          <p className="text-xs text-dark-400">
            Arquivo: {resultado.arquivoNome || '—'}
            {resultado.importadoPor && ` · importado por ${resultado.importadoPor}`}
            {resultado.importadoEm && ` em ${new Date(resultado.importadoEm).toLocaleString('pt-BR')}`}
          </p>
        </>
      )}

      {canWrite && (
        <div className="pt-4 border-t border-dark-700 space-y-3">
          <label className="block text-sm font-medium text-dark-300">
            {resultado ? 'Substituir por outro relatório' : 'Relatório do Protheus (.xml)'}
          </label>
          <input
            type="file"
            accept=".xml"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-dark-700 file:text-dark-200 file:text-sm"
          />
          <div className="flex justify-end gap-3">
            {resultado && (
              <button onClick={handleRemover} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Remover resultado
              </button>
            )}
            <button onClick={handleImportar} disabled={importando || !arquivo} className="btn-primary disabled:opacity-50">
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importando ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryResultPanel({ inventario, nomeFilial, estoqueDividido, canWrite, onClose, onImportado, showToast }) {
  const { confirmar, dialogoConfirmacao } = useConfirm();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!inventario) return;
    buscarConfiguracaoQualidade()
      .then(setConfig)
      .catch((erro) => showToast(erro.message || 'Erro ao carregar as metas de acuracidade.', 'error'));
  }, [inventario, showToast]);

  return (
    <SidePanel
      isOpen={!!inventario}
      onClose={onClose}
      title={`Resultado — ${nomeFilial}`}
      size={estoqueDividido ? 'xl' : 'lg'}
    >
      {dialogoConfirmacao}

      {inventario && (
        estoqueDividido ? (
          <div className="space-y-8">
            <BlocoImportacao
              inventarioId={inventario.id} armazem="ARMAZEM_01" titulo="Loja (armazém 01)"
              canWrite={canWrite} config={config} confirmar={confirmar} onImportado={onImportado} showToast={showToast}
            />
            <div className="border-t border-dark-700 pt-8">
              <BlocoImportacao
                inventarioId={inventario.id} armazem="ARMAZEM_03" titulo="Estoque (armazém 03)"
                canWrite={canWrite} config={config} confirmar={confirmar} onImportado={onImportado} showToast={showToast}
              />
            </div>
          </div>
        ) : (
          <BlocoImportacao
            inventarioId={inventario.id} armazem={null} titulo={null}
            canWrite={canWrite} config={config} confirmar={confirmar} onImportado={onImportado} showToast={showToast}
          />
        )
      )}
    </SidePanel>
  );
}
