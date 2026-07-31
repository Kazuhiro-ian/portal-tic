import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSlidePanel } from '../hooks/useSlidePanel.js';

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

export function AssetFormPanel({ open, ativo, tipo, tipoLabel, filiais, onSave, onClose, showToast }) {
  const { mounted, visible } = useSlidePanel(open);
  const [formData, setFormData] = useState(() => formFromAtivo(ativo));

  useEffect(() => {
    if (open) {
      setFormData(formFromAtivo(ativo));
    }
  }, [open, ativo]);

  if (!mounted) return null;

  const mostraHardware = tipo === 'DESKTOP' || tipo === 'NOTEBOOK';

  const handleSubmit = () => {
    if (!formData.marca.trim() || !formData.modelo.trim()) {
      showToast('Preencha marca e modelo.', 'error');
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
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Marca *</label>
            <input
              type="text"
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              className="input-field"
              placeholder="Ex: Dell, Zebra, Samsung"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Modelo *</label>
            <input
              type="text"
              value={formData.modelo}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              className="input-field"
              placeholder="Ex: Latitude 5420"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Etiqueta (patrimônio)</label>
            <input
              type="text"
              value={formData.etiqueta}
              onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
              className="input-field"
              placeholder="Ex: PAT-00123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Status Inicial</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="select-field"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Endereço IP</label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="input-field"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Número de Série</label>
            <input
              type="text"
              value={formData.numeroSerie}
              onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">MAC Address</label>
            <input
              type="text"
              value={formData.macAddress}
              onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
              className="input-field"
              placeholder="00:1A:2B:3C:4D:5E"
            />
          </div>
          {tipo === 'CELULAR' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">IMEI</label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                className="input-field"
              />
            </div>
          )}
          {mostraHardware && (
            <>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Processador</label>
                <input
                  type="text"
                  value={formData.processador}
                  onChange={(e) => setFormData({ ...formData, processador: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Intel i5 11ª geração"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Memória</label>
                <input
                  type="text"
                  value={formData.memoria}
                  onChange={(e) => setFormData({ ...formData, memoria: e.target.value })}
                  className="input-field"
                  placeholder="Ex: 16GB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Armazenamento</label>
                <input
                  type="text"
                  value={formData.armazenamento}
                  onChange={(e) => setFormData({ ...formData, armazenamento: e.target.value })}
                  className="input-field"
                  placeholder="Ex: 512GB SSD"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Filial</label>
            <select
              value={formData.filialId}
              onChange={(e) => setFormData({ ...formData, filialId: e.target.value })}
              className="select-field"
            >
              <option value="">Sem filial</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numeroFilial} - {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Setor</label>
            <input
              type="text"
              value={formData.setor}
              onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
              className="input-field"
              placeholder="Ex: Financeiro"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Responsável Atual</label>
            <input
              type="text"
              value={formData.responsavelAtual}
              onChange={(e) => setFormData({ ...formData, responsavelAtual: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Última Manutenção</label>
            <input
              type="date"
              value={formData.lastMaintenance}
              onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-dark-700">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            {ativo ? 'Salvar Alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
