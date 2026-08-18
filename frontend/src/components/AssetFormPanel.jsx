import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSlidePanel } from '../hooks/useSlidePanel.js';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery.js';
import { SidePanel } from './SidePanel.jsx';

const PANEL_WIDTH = 420;

const emptyForm = {
  marca: '',
  modelo: '',
  status: 'Offline',
  etiqueta: '',
  ip: '',
  numeroSerie: '',
  macAddress: '',
  imei: '',
  processador: '',
  memoria: '',
  armazenamento: '',
  filialId: '',
  setor: '',
  responsavelAtual: '',
  observacoes: '',
  lastMaintenance: '',
};

function formFromAtivo(ativo) {
  if (!ativo) return emptyForm;
  return {
    marca: ativo.marca || '',
    modelo: ativo.modelo || '',
    status: ativo.status || 'Offline',
    etiqueta: ativo.etiqueta || '',
    ip: ativo.ip || '',
    numeroSerie: ativo.numeroSerie || '',
    macAddress: ativo.macAddress || '',
    imei: ativo.imei || '',
    processador: ativo.processador || '',
    memoria: ativo.memoria || '',
    armazenamento: ativo.armazenamento || '',
    filialId: ativo.filialId || '',
    setor: ativo.setor || '',
    responsavelAtual: ativo.responsavelAtual || '',
    observacoes: ativo.observacoes || '',
    lastMaintenance: ativo.lastMaintenance || '',
  };
}

// Metadados de exibição de cada campo possível. O que aparece no formulário e em que
// ordem é decidido por tipo em CAMPOS_POR_TIPO, não aqui.
const CAMPOS = {
  marca: { label: 'Marca', placeholder: 'Ex: Dell, Zebra, Samsung' },
  modelo: { label: 'Modelo', placeholder: 'Ex: Latitude 5420' },
  etiqueta: { label: 'Etiqueta (patrimônio)', placeholder: 'Ex: PAT-00123' },
  status: { label: 'Status Inicial', tipoCampo: 'status' },
  ip: { label: 'Endereço IP', placeholder: '192.168.1.100' },
  numeroSerie: { label: 'Número de Série' },
  macAddress: { label: 'MAC Address', placeholder: '00:1A:2B:3C:4D:5E' },
  imei: { label: 'IMEI' },
  processador: { label: 'Processador', placeholder: 'Ex: Intel i5 11ª geração' },
  memoria: { label: 'Memória', placeholder: 'Ex: 16GB' },
  armazenamento: { label: 'Armazenamento', placeholder: 'Ex: 512GB SSD' },
  filialId: { label: 'Filial', tipoCampo: 'filial' },
  setor: { label: 'Setor', placeholder: 'Ex: Financeiro' },
  responsavelAtual: { label: 'Responsável Atual' },
  lastMaintenance: { label: 'Última Manutenção', tipoCampo: 'data' },
  observacoes: { label: 'Observações', tipoCampo: 'textarea' },
};

// Campos padrão usados por Coletor e as duas impressoras -- nenhum deles tem um recorte
// específico ainda, então mantêm o formulário completo que a tela sempre teve.
const CAMPOS_PADRAO = [
  { chave: 'marca', obrigatorio: true },
  { chave: 'modelo', obrigatorio: true },
  'etiqueta', 'status', 'ip', 'numeroSerie', 'macAddress',
  'filialId', 'setor', 'responsavelAtual', 'lastMaintenance', 'observacoes',
];

// Lista (e obrigatoriedade) dos campos do formulário, por tipo de ativo. Um tipo sem
// entrada aqui cai no CAMPOS_PADRAO.
const CAMPOS_POR_TIPO = {
  // Recorte pedido para a aba Desktops: só o que o time realmente usa no dia a dia.
  DESKTOP: [
    'etiqueta',
    { chave: 'ip', obrigatorio: true },
    'processador', 'memoria', 'armazenamento',
    { chave: 'filialId', obrigatorio: true },
    'setor', 'observacoes',
  ],
  NOTEBOOK: [
    { chave: 'marca', obrigatorio: true },
    { chave: 'modelo', obrigatorio: true },
    'macAddress', 'processador', 'memoria', 'armazenamento',
    'filialId', 'responsavelAtual',
  ],
  CELULAR: [
    { chave: 'marca', obrigatorio: true },
    { chave: 'modelo', obrigatorio: true },
    'macAddress', 'imei', 'filialId',
  ],
  COLETOR: [
    { chave: 'modelo', obrigatorio: true },
    'ip', 'macAddress', 'filialId',
  ],
  IMPRESSORA: [
    { chave: 'marca', obrigatorio: true },
    { chave: 'modelo', obrigatorio: true },
    'ip', 'numeroSerie', 'filialId', 'observacoes',
  ],
  IMPRESSORA_ZEBRA: CAMPOS_PADRAO,
};

// Abaixo de md, 420px inline não cabe na tela — vira um SidePanel em sobreposição
// (tela cheia no mobile). No desktop mantém o painel inline que empurra a tabela.
// Ver PLANO-MOBILE.md §4.5.
export function AssetFormPanel({ open, ativo, tipo, tipoLabel, filiais, onSave, onClose, showToast }) {
  const { mounted, visible } = useSlidePanel(open);
  const isDesktop = useMediaQuery(BREAKPOINTS.md);
  const [formData, setFormData] = useState(() => formFromAtivo(ativo));

  useEffect(() => {
    if (open) {
      setFormData(formFromAtivo(ativo));
    }
  }, [open, ativo]);

  const campos = (CAMPOS_POR_TIPO[tipo] || CAMPOS_PADRAO).map((c) =>
    typeof c === 'string' ? { chave: c, obrigatorio: false } : c
  );

  const handleChange = (chave, valor) => setFormData((prev) => ({ ...prev, [chave]: valor }));

  const handleSubmit = () => {
    const faltando = campos.find(({ chave, obrigatorio }) => obrigatorio && !String(formData[chave] ?? '').trim());
    if (faltando) {
      showToast(`Preencha o campo "${CAMPOS[faltando.chave].label}".`, 'error');
      return;
    }

    const payload = {
      ...formData,
      tipo,
      filialId: formData.filialId ? Number(formData.filialId) : null,
      lastMaintenance: formData.lastMaintenance ? formData.lastMaintenance : null,
    };

    onSave(payload);
  };

  const renderCampo = ({ chave, obrigatorio }) => {
    const def = CAMPOS[chave];
    const label = `${def.label}${obrigatorio ? ' *' : ''}`;

    if (def.tipoCampo === 'status') {
      return (
        <div key={chave}>
          <label htmlFor={`ativo-${chave}`} className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
          <select id={`ativo-${chave}`} value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="select-field">
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>
        </div>
      );
    }

    if (def.tipoCampo === 'filial') {
      return (
        <div key={chave}>
          <label htmlFor={`ativo-${chave}`} className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
          <select id={`ativo-${chave}`} value={formData.filialId} onChange={(e) => handleChange('filialId', e.target.value)} className="select-field">
            <option value="">{obrigatorio ? 'Selecione a filial' : 'Sem filial'}</option>
            {filiais.map((f) => (
              <option key={f.id} value={f.id}>
                {f.numeroFilial} - {f.nome}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (def.tipoCampo === 'data') {
      return (
        <div key={chave}>
          <label htmlFor={`ativo-${chave}`} className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
          <input
            id={`ativo-${chave}`}
            type="date"
            value={formData.lastMaintenance}
            onChange={(e) => handleChange('lastMaintenance', e.target.value)}
            className="input-field"
          />
        </div>
      );
    }

    if (def.tipoCampo === 'textarea') {
      return (
        <div key={chave}>
          <label htmlFor={`ativo-${chave}`} className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
          <textarea
            id={`ativo-${chave}`}
            value={formData.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            className="input-field"
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={chave}>
        <label htmlFor={`ativo-${chave}`} className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
        <input
          id={`ativo-${chave}`}
          type="text"
          value={formData[chave]}
          onChange={(e) => handleChange(chave, e.target.value)}
          className="input-field"
          placeholder={def.placeholder}
        />
      </div>
    );
  };

  const rodape = (
    <>
      <button onClick={onClose} className="btn-secondary">
        Cancelar
      </button>
      <button onClick={handleSubmit} className="btn-primary">
        {ativo ? 'Salvar Alterações' : 'Adicionar'}
      </button>
    </>
  );

  if (!isDesktop) {
    return (
      <SidePanel
        isOpen={open}
        onClose={onClose}
        title={ativo ? `Editar ${tipoLabel}` : `Novo em ${tipoLabel}`}
        size="md"
        footer={rodape}
      >
        <div className="space-y-4">{campos.map(renderCampo)}</div>
      </SidePanel>
    );
  }

  if (!mounted) return null;

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
          <h2 className="text-lg font-semibold text-white">
            {ativo ? `Editar ${tipoLabel}` : `Novo em ${tipoLabel}`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          {campos.map(renderCampo)}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-dark-700">
          {rodape}
        </div>
      </div>
    </div>
  );
}
