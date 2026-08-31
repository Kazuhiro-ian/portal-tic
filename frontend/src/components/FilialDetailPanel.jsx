import { Edit, X } from "lucide-react";
import { useSlidePanel } from "../hooks/useSlidePanel.js";
import { useMediaQuery, BREAKPOINTS } from "../hooks/useMediaQuery.js";
import { SidePanel } from "./SidePanel.jsx";
import { grupoLabels, periodicidadeLabels } from "../utils/qualidade.js";

const PANEL_WIDTH = 420;

function Campo({ label, valor }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-dark-700/50 last:border-b-0">
      <span className="text-sm text-dark-400">{label}</span>
      <span className="text-sm text-dark-100 text-right">{valor || "—"}</span>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">
        {titulo}
      </h3>
      <div>{children}</div>
    </div>
  );
}

export function FilialDetailPanel({ open, filial, onEdit, onClose }) {
  const { mounted, visible } = useSlidePanel(open);
  const isDesktop = useMediaQuery(BREAKPOINTS.md);

  if (!filial) return null;

  const tituloPainel = `Filial ${filial.numeroFilial} — ${filial.nome}`;

  const tipoLabel =
    filial.tipoFilial === "CD"
      ? "Centro de Distribuição"
      : filial.tipoFilial === "LOJA"
        ? "Loja"
        : null;

  const referenciaFormatada = filial.referenciaBimestral
    ? new Date(filial.referenciaBimestral + "T00:00:00").toLocaleDateString(
        "pt-BR",
        { month: "long", year: "numeric" },
      )
    : null;

  const conteudo = (
    <div className="space-y-5">
      <Secao titulo="Identificação">
        <Campo label="Número da Filial" valor={filial.numeroFilial} />
        <Campo label="Nome" valor={filial.nome} />
        <Campo label="CNPJ" valor={filial.cnpj} />
      </Secao>

      <Secao titulo="Endereço">
        <Campo label="Endereço" valor={filial.endereco} />
      </Secao>

      <Secao titulo="Contato">
        <Campo label="Ramal" valor={filial.ramal} />
        <Campo label="WhatsApp" valor={filial.whatsapp} />
      </Secao>

      <Secao titulo="Configuração">
        <Campo label="Tipo" valor={tipoLabel} />
        {filial.tipoFilial === "LOJA" && (
          <Campo
            label="Estoque Dividido"
            valor={filial.estoqueDividido ? "Sim" : "Não"}
          />
        )}
        <Campo
          label="Grupo de Recebimento"
          valor={
            filial.grupoRecebimento
              ? grupoLabels[filial.grupoRecebimento]
              : null
          }
        />
        <Campo
          label="Periodicidade do Inventário"
          valor={
            periodicidadeLabels[filial.periodicidadeInventario || "MENSAL"]
          }
        />
        {filial.periodicidadeInventario === "BIMESTRAL" && (
          <Campo label="Mês de Referência" valor={referenciaFormatada} />
        )}
      </Secao>
    </div>
  );

  if (!isDesktop) {
    return (
      <SidePanel
        isOpen={open}
        onClose={onClose}
        title={tituloPainel}
        size="md"
        footer={
          <>
            <button onClick={onClose} className="btn-secondary">
              Fechar
            </button>
            <button onClick={onEdit} className="btn-primary">
              <Edit className="w-4 h-4" />
              Editar
            </button>
          </>
        }
      >
        {conteudo}
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
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ width: PANEL_WIDTH }}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{tituloPainel}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-11 h-11 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {conteudo}
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
