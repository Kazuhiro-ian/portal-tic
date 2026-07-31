import { useState } from 'react';
import { HardDrive } from 'lucide-react';
import { AssetList } from './AssetList.jsx';

const TIPOS = [
  { id: 'DESKTOP', label: 'Desktops' },
  { id: 'NOTEBOOK', label: 'Notebooks' },
  { id: 'CELULAR', label: 'Celulares' },
  { id: 'IMPRESSORA', label: 'Impressoras' },
  { id: 'COLETOR', label: 'Coletores Zebra' },
  { id: 'IMPRESSORA_ZEBRA', label: 'Impressoras Zebra' },
];

export function AssetInventory() {
  const [aba, setAba] = useState(TIPOS[0].id);
  const tipoAtivo = TIPOS.find((t) => t.id === aba);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-primary-400" />
          Ativos
        </h1>
        <p className="text-dark-400 mt-1">Inventário de aparelhos de TI da empresa</p>
      </div>

      <div className="flex gap-1 p-1 bg-dark-800 rounded-lg w-fit flex-wrap">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              aba === t.id ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AssetList tipo={tipoAtivo.id} tipoLabel={tipoAtivo.label} />
    </div>
  );
}