import { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Trash2, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import {
  importarResultadoInventario, buscarResultadoInventario,
  removerResultadoInventario, buscarConfiguracaoQualidade,
} from '../services/api.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { percentual, moeda, inteiro, unidade } from '../utils/formato.js';

const ARMAZENS = [
  { valor: 'ARMAZEM_01', titulo: 'Loja (armazém 01)' },
  { valor: 'ARMAZEM_03', titulo: 'Estoque (armazém 03)' },
];

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

/** Busca/recarrega o resultado de um armazém (ou do inventário inteiro, se `armazem` é null). */
function useResultado(inventarioId, armazem, showToast) {
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
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
    recarregar();
  }, [recarregar]);

  return { resultado, carregando, recarregar };
}

/** Indicadores calculados de um armazém já importado, ou o estado vazio se ainda não importou. */
function ResultadoView({ resultado, carregando, titulo, canWrite, config, onRemover }) {
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

          {canWrite && (
            <div className="flex justify-end">
              <button onClick={onRemover} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Remover resultado
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Um seletor de arquivo com indicação do resultado da última tentativa de importação. */
function SeletorArquivo({ titulo, arquivo, status, mensagemErro, onEscolher }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-dark-300">
        {titulo || 'Relatório do Protheus (.xml)'}
      </label>
      <input
        type="file"
        accept=".xml"
        onChange={(e) => onEscolher(e.target.files?.[0] || null)}
        disabled={status === 'importando'}
        className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-dark-700 file:text-dark-200 file:text-sm disabled:opacity-50"
      />
      {status === 'importando' && (
        <p className="text-xs text-dark-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando...
        </p>
      )}
      {status === 'sucesso' && (
        <p className="text-xs text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Importado.
        </p>
      )}
      {status === 'erro' && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 shrink-0" /> {mensagemErro || 'Erro ao importar.'}
        </p>
      )}
      {!arquivo && status !== 'importando' && (
        <p className="text-xs text-dark-500">Nenhum arquivo escolhido.</p>
      )}
    </div>
  );
}

/**
 * Importa até duas planilhas (uma por armazém) num único fluxo: dois seletores de arquivo
 * lado a lado e um botão "Importar" só, que envia as que estiverem selecionadas. Sequencial
 * (não em paralelo) de propósito -- duas gravações concorrentes para o mesmo inventário
 * arriscam esbarrar uma na outra no banco, então uma espera a outra terminar.
 */
function ImportadorDuplo({ inventarioId, canWrite, config, confirmar, onImportado, showToast }) {
  const resultados = {
    ARMAZEM_01: useResultado(inventarioId, 'ARMAZEM_01', showToast),
    ARMAZEM_03: useResultado(inventarioId, 'ARMAZEM_03', showToast),
  };

  const [arquivos, setArquivos] = useState({ ARMAZEM_01: null, ARMAZEM_03: null });
  const [status, setStatus] = useState({ ARMAZEM_01: 'idle', ARMAZEM_03: 'idle' });
  const [erros, setErros] = useState({ ARMAZEM_01: null, ARMAZEM_03: null });

  const escolherArquivo = (armazem) => (arquivo) => {
    setArquivos((a) => ({ ...a, [armazem]: arquivo }));
    setStatus((s) => ({ ...s, [armazem]: 'idle' }));
  };

  const handleRemover = (armazem, titulo) => async () => {
    const confirmado = await confirmar({
      titulo: 'Remover resultado',
      mensagem: `Isso apaga os produtos importados e os indicadores calculados de ${titulo}. Deseja continuar?`,
    });
    if (!confirmado) return;

    try {
      await removerResultadoInventario(inventarioId, armazem);
      showToast('Resultado removido.');
      resultados[armazem].recarregar();
      if (onImportado) onImportado();
    } catch (erro) {
      showToast(erro.message || 'Erro ao remover o resultado.', 'error');
    }
  };

  const selecionados = ARMAZENS.filter(({ valor }) => arquivos[valor]);
  const importandoGeral = selecionados.some(({ valor }) => status[valor] === 'importando');

  const handleImportar = async () => {
    if (selecionados.length === 0) {
      showToast('Selecione ao menos um arquivo antes de importar.', 'error');
      return;
    }

    const sucessos = [];
    const falhas = [];

    for (const { valor, titulo } of selecionados) {
      setStatus((s) => ({ ...s, [valor]: 'importando' }));
      try {
        await importarResultadoInventario(inventarioId, arquivos[valor], valor);
        setStatus((s) => ({ ...s, [valor]: 'sucesso' }));
        setArquivos((a) => ({ ...a, [valor]: null }));
        resultados[valor].recarregar();
        sucessos.push(titulo);
      } catch (erro) {
        const mensagem = erro.message || 'Erro ao importar o relatório.';
        setStatus((s) => ({ ...s, [valor]: 'erro' }));
        setErros((e) => ({ ...e, [valor]: mensagem }));
        falhas.push(`${titulo}: ${mensagem}`);
      }
    }

    if (falhas.length === 0) {
      showToast(
        sucessos.length === 2
          ? 'As duas planilhas foram importadas. O inventário foi marcado como realizado.'
          : `${sucessos[0]} importado. O inventário foi marcado como realizado.`,
      );
    } else {
      showToast(
        [...sucessos.map((t) => `${t}: importado.`), ...falhas].join(' '),
        'error',
      );
    }

    if (sucessos.length > 0 && onImportado) onImportado();
  };

  return (
    <div className="space-y-8">
      <ResultadoView
        resultado={resultados.ARMAZEM_01.resultado}
        carregando={resultados.ARMAZEM_01.carregando}
        titulo="Loja (armazém 01)"
        canWrite={canWrite}
        config={config}
        onRemover={handleRemover('ARMAZEM_01', 'Loja (armazém 01)')}
      />
      <div className="border-t border-dark-700 pt-8">
        <ResultadoView
          resultado={resultados.ARMAZEM_03.resultado}
          carregando={resultados.ARMAZEM_03.carregando}
          titulo="Estoque (armazém 03)"
          canWrite={canWrite}
          config={config}
          onRemover={handleRemover('ARMAZEM_03', 'Estoque (armazém 03)')}
        />
      </div>

      {canWrite && (
        <div className="pt-4 border-t border-dark-700 space-y-4">
          <h3 className="font-semibold text-white">Importar relatórios do Protheus (.xml)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ARMAZENS.map(({ valor, titulo }) => (
              <SeletorArquivo
                key={valor}
                titulo={titulo}
                arquivo={arquivos[valor]}
                status={status[valor]}
                mensagemErro={erros[valor]}
                onEscolher={escolherArquivo(valor)}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleImportar}
              disabled={importandoGeral || selecionados.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {importandoGeral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importandoGeral
                ? 'Importando...'
                : selecionados.length === 2
                  ? 'Importar as duas planilhas'
                  : 'Importar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Upload + resultado do inventário inteiro, para filiais sem estoque dividido (um armazém só). */
function ImportadorUnico({ inventarioId, canWrite, config, confirmar, onImportado, showToast }) {
  const { resultado, carregando, recarregar } = useResultado(inventarioId, null, showToast);
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);

  const handleImportar = async () => {
    if (!arquivo) {
      showToast('Selecione o arquivo do relatório antes de importar.', 'error');
      return;
    }
    try {
      setImportando(true);
      await importarResultadoInventario(inventarioId, arquivo, null);
      recarregar();
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
      mensagem: 'Isso apaga os produtos importados e os indicadores calculados deste inventário. Deseja continuar?',
    });
    if (!confirmado) return;

    try {
      await removerResultadoInventario(inventarioId, null);
      recarregar();
      showToast('Resultado removido.');
      if (onImportado) onImportado();
    } catch (erro) {
      showToast(erro.message || 'Erro ao remover o resultado.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ResultadoView
        resultado={resultado}
        carregando={carregando}
        titulo={null}
        canWrite={canWrite}
        config={config}
        onRemover={handleRemover}
      />

      {canWrite && (
        <div className="pt-4 border-t border-dark-700 space-y-3">
          <SeletorArquivo
            titulo={resultado ? 'Substituir por outro relatório' : 'Relatório do Protheus (.xml)'}
            arquivo={arquivo}
            status={importando ? 'importando' : 'idle'}
            onEscolher={setArquivo}
          />
          <div className="flex justify-end">
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
          <ImportadorDuplo
            inventarioId={inventario.id}
            canWrite={canWrite} config={config} confirmar={confirmar} onImportado={onImportado} showToast={showToast}
          />
        ) : (
          <ImportadorUnico
            inventarioId={inventario.id}
            canWrite={canWrite} config={config} confirmar={confirmar} onImportado={onImportado} showToast={showToast}
          />
        )
      )}
    </SidePanel>
  );
}
