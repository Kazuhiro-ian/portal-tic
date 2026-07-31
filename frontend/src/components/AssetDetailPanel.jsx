import { Edit, X } from 'lucide-react';
import { useSlidePanel } from '../hooks/useSlidePanel.js';

const PANEL_WIDTH = 420;

function Campo({ label, valor }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-dark-700/50 last:border-b-0">
      <span className="text-sm text-dark-400">{label}</span>
      <span className="text-sm text-dark-100 text-right">{valor || '—'}</span>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">{titulo}</h3>
      <div>{children}</div>
    </div>
  );
}

export function AssetDetailPanel({ open, ativo, tipoLabel, filiais, onEdit, onClose }) {
  const { mounted, visible } = useSlidePanel(open);

  if (!mounted || !ativo) return null;

  const mostraHardware = ativo.tipo === 'DESKTOP' || ativo.tipo === 'NOTEBOOK';
  const mostraImei = ativo.tipo === 'CELULAR';

  const filial = filiais.find((f) => f.id === ativo.filialId);
  const nomeFilial = filial ? `${filial.numeroFilial} - ${filial.nome}` : '—';

  const dataFormatada = ativo.lastMaintenance
    ? new Date(ativo.lastMaintenance + 'T00:00:00').toLocaleDateString('pt-BR')
    : null;

  return (
    <div
      className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      style={{ width: visible ? PANEL_WIDTH : 0 }}
    >
      <div
        className={`h-full bg-dark-800 border border-dark-700 rounded-xl flex flex-col transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: PANEL_WIDTH }}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{tipoLabel}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
          <Secao titulo="Identificação">
            <Campo label="Marca" valor={ativo.marca} />
            <Campo label="Modelo" valor={ativo.modelo} />
            <Campo label="Etiqueta" valor={ativo.etiqueta} />
            <Campo label="Nº de Série" valor={ativo.numeroSerie} />
          </Secao>

          {mostraHardware && (
            <Secao titulo="Hardware">
              <Campo label="Processador" valor={ativo.processador} />
              <Campo label="Memória" valor={ativo.memoria} />
              <Campo label="Armazenamento" valor={ativo.armazenamento} />
            </Secao>
          )}

          <Secao titulo="Rede">
            <Campo label="IP" valor={ativo.ip} />
            <Campo label="MAC Address" valor={ativo.macAddress} />
            {mostraImei && <Campo label="IMEI" valor={ativo.imei} />}
          </Secao>

          <Secao titulo="Localização">
            <Campo label="Filial" valor={nomeFilial} />
            <Campo label="Setor" valor={ativo.setor} />
            <Campo label="Responsável Atual" valor={ativo.responsavelAtual} />
          </Secao>

          <Secao titulo="Status">
            <Campo label="Status atual" valor={ativo.status} />
            <Campo label="Última Manutenção" valor={dataFormatada} />
          </Secao>

          <Secao titulo="Observações">
            <p className="text-sm text-dark-100 whitespace-pre-wrap">{ativo.observacoes || '—'}</p>
          </Secao>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-dark-700">
          <button onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          <button onClick={onEdit} className="btn-primary">
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
