import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, UserCheck, ChevronLeft, ChevronRight, Clock, Moon, CheckCircle2, AlertCircle, X, Coffee } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { 
  listarColaboradores, salvarColaborador, atualizarColaborador, deletarColaborador,
  listarEscalasPorPeriodo, salvarEscalaDia 
} from '../services/api.js';

const weekDays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

const TURNOS_OPCOES = [
  { label: '07:00 - 16:48 (Abertura)', value: '07:00 - 16:48' },
  { label: '08:00 - 17:48 (Comercial)', value: '08:00 - 17:48' },
  { label: '11:30 - 21:18 (Fechamento)', value: '11:30 - 21:18' },
  { label: 'Plantão Fim de Semana', value: 'Plantão' },
  { label: 'Folga / Descanso', value: 'Folga' }
];

const emptyForm = { name: '', role: '', isOnCall: false };

export function EmployeeSchedule() {
  const [employees, setEmployees] = useState([]);
  const [escalas, setEscalas] = useState({}); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Guarda qual célula está aberta
  const [activeCellMenu, setActiveCellMenu] = useState(null); 

  // Novo estado para controlar a visualização do card lateral ('trabalhando' ou 'folga')
  const [viewModeToday, setViewModeToday] = useState('trabalhando');

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); }, 4000);
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, [currentWeekOffset]);

  const carregarDadosIniciais = async () => {
    try {
      setIsLoading(true);
      const cols = await listarColaboradores();
      setEmployees(cols);

      const dates = getWeekDates(currentWeekOffset);
      const inicioStr = dates[0].toISOString().split('T')[0];
      const fimStr = dates[6].toISOString().split('T')[0];

      const listaEscalas = await listarEscalasPorPeriodo(inicioStr, fimStr);
      
      const mapaEscalas = {};
      listaEscalas.forEach((e) => {
        mapaEscalas[`${e.colaboradorId}_${e.data}`] = e.turno;
      });
      setEscalas(mapaEscalas);

    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar escala do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekDates = (offset) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + offset * 7);
    return weekDays.map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return date;
    });
  };

  const weekDates = getWeekDates(currentWeekOffset);
  const today = new Date();

  const handleSelectTurno = async (colaboradorId, dataDateObj, turnoSelecionado) => {
    const dataStr = dataDateObj.toISOString().split('T')[0];
    const key = `${colaboradorId}_${dataStr}`;
    
    try {
      const payload = {
        colaboradorId: Number(colaboradorId),
        data: dataStr,
        turno: turnoSelecionado
      };

      await salvarEscalaDia(payload);
      
      setEscalas(prev => ({ ...prev, [key]: turnoSelecionado }));
      setActiveCellMenu(null);
      showToast('Escala atualizada com sucesso!');
    } catch (error) {
      showToast('Erro ao atualizar turno.', 'error');
    }
  };

  const handleOpenModal = (employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name || '',
        role: employee.role || '',
        isOnCall: employee.isOnCall || false,
      });
    } else {
      setEditingEmployee(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleSaveColaborador = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      showToast('Nome e Cargo são obrigatórios.', 'error');
      return;
    }

    try {
      if (editingEmployee) {
        await atualizarColaborador(editingEmployee.id, formData);
        showToast('Colaborador atualizado com sucesso!');
      } else {
        await salvarColaborador(formData);
        showToast('Novo colaborador cadastrado!');
      }
      
      await carregarDadosIniciais();
      setShowModal(false);
      setEditingEmployee(null);
      setFormData(emptyForm);
    } catch (error) {
      showToast('Erro ao salvar colaborador.', 'error');
    }
  };

  const handleDeleteColaborador = async (id) => {
    if (confirm('Tem certeza que deseja excluir este colaborador?')) {
      try {
        await deletarColaborador(id);
        showToast('Colaborador excluído.');
        await carregarDadosIniciais();
      } catch (error) {
        showToast('Erro ao excluir colaborador.', 'error');
      }
    }
  };

  // Filtros do dia atual
  const todayStr = today.toISOString().split('T')[0];
  
  const workingToday = employees.filter((e) => {
    const turnoHoje = escalas[`${e.id}_${todayStr}`];
    return turnoHoje && turnoHoje !== 'Folga' && turnoHoje !== '-';
  });

  const offToday = employees.filter((e) => {
    const turnoHoje = escalas[`${e.id}_${todayStr}`];
    return !turnoHoje || turnoHoje === 'Folga' || turnoHoje === '-';
  });

  return (
    <div className="space-y-6 relative">
      
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-dark-800 text-white transition-all">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-dark-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Escala e Turnos 5x2</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${employees.length} colaboradores cadastrados`}
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                className="btn-secondary px-3 py-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">
                  Semana {currentWeekOffset === 0 ? 'Atual' : currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}
                </h2>
                <p className="text-sm text-dark-400">
                  {weekDates[0].toLocaleDateString('pt-BR')} - {weekDates[6].toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                className="btn-secondary px-3 py-2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto pb-24 pt-2">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="table-header w-40">Colaborador</th>
                    {weekDays.map((day, index) => {
                      const isToday = weekDates[index].toDateString() === today.toDateString();
                      const isFimDeSemana = day === 'Sabado' || day === 'Domingo';
                      return (
                        <th
                          key={day}
                          className={`table-header text-center ${isToday ? 'bg-primary-500/10' : ''}`}
                        >
                          <div>
                            <p className={isToday ? 'text-primary-400' : ''}>
                              {day} {isFimDeSemana && <span className="text-[10px] text-amber-400 block font-normal">Plantão</span>}
                            </p>
                            <p className={`text-xs font-normal ${isToday ? 'text-primary-300' : 'text-dark-400'}`}>
                              {weekDates[index].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </p>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-dark-400">
                        Carregando escala do banco de dados...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-dark-400">
                        Nenhum colaborador cadastrado. Clique em "Novo Colaborador" acima.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee, empIndex) => (
                      <tr key={employee.id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="table-cell">
                          <div>
                            <p className="font-medium text-white">{employee.name}</p>
                            <p className="text-xs text-dark-400">{employee.role}</p>
                            {employee.isOnCall && (
                              <span className="badge badge-warning mt-1">
                                <Moon className="w-3 h-3 mr-1" />
                                Sobreaviso
                              </span>
                            )}
                          </div>
                        </td>
                        {weekDates.map((dateObj, dayIndex) => {
                          const dataStr = dateObj.toISOString().split('T')[0];
                          const cellKey = `${employee.id}_${dataStr}`;
                          const turnoAtual = escalas[cellKey] || 'Folga';
                          const isToday = dateObj.toDateString() === today.toDateString();
                          const isOpenMenu = activeCellMenu === cellKey;

                          let badgeStyle = "bg-dark-700 text-dark-400 border border-dark-600";
                          if (turnoAtual.includes('07:00')) badgeStyle = "bg-blue-500/15 text-blue-300 border border-blue-500/30";
                          else if (turnoAtual.includes('08:00')) badgeStyle = "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
                          else if (turnoAtual.includes('11:30')) badgeStyle = "bg-purple-500/15 text-purple-300 border border-purple-500/30";
                          else if (turnoAtual === 'Plantão') badgeStyle = "bg-amber-500/15 text-amber-300 border border-amber-500/30";

                          const isLastRows = empIndex >= employees.length - 2 && employees.length > 2;
                          const isRightColumns = dayIndex >= 4;

                          let positionClasses = "top-12";
                          if (isLastRows) positionClasses = "bottom-12";

                          let alignClasses = "left-1/2 -translate-x-1/2";
                          if (isRightColumns) alignClasses = "right-0";
                          else if (dayIndex <= 1) alignClasses = "left-0";

                          return (
                            <td
                              key={dataStr}
                              className={`table-cell text-center cursor-pointer group relative ${isToday ? 'bg-primary-500/5' : ''}`}
                              onClick={() => setActiveCellMenu(isOpenMenu ? null : cellKey)}
                            >
                              <div className="flex flex-col items-center py-1">
                                <span className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${badgeStyle}`}>
                                  {turnoAtual}
                                </span>
                                <span className="text-[10px] text-dark-400 opacity-0 group-hover:opacity-100 mt-1 transition-opacity">Alterar</span>
                              </div>

                              {isOpenMenu && (
                                <div 
                                  className={`absolute z-50 ${positionClasses} ${alignClasses} w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-1.5 space-y-1 text-left`} 
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="text-[10px] text-dark-400 px-2 py-1 uppercase tracking-wider font-semibold border-b border-dark-700">Selecione o Turno</p>
                                  {TURNOS_OPCOES.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => handleSelectTurno(employee.id, dateObj, opt.value)}
                                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors flex items-center justify-between ${
                                        turnoAtual === opt.value ? 'bg-primary-600 text-white font-bold' : 'text-dark-200 hover:bg-dark-700'
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD LATERAL COM O NOVO BOTÃO ALTERNADOR DE VISUALIZAÇÃO */}
        <div className="card h-fit lg:col-span-1">
          <div className="flex items-center justify-between mb-3 border-b border-dark-700 pb-3">
            <div className="flex items-center gap-2">
              {viewModeToday === 'trabalhando' ? (
                <Clock className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <h2 className="text-base font-semibold text-white">
                {viewModeToday === 'trabalhando' ? 'Escalados Hoje' : 'De Folga Hoje'}
              </h2>
            </div>
          </div>

          {/* Botões de alternância Trabalhando / Folga */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-dark-800 rounded-lg border border-dark-700 mb-4">
            <button
              type="button"
              onClick={() => setViewModeToday('trabalhando')}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                viewModeToday === 'trabalhando'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Trabalhando ({workingToday.length})
            </button>
            <button
              type="button"
              onClick={() => setViewModeToday('folga')}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                viewModeToday === 'folga'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Folga ({offToday.length})
            </button>
          </div>

          <p className="text-dark-400 mb-4 text-xs">
            {weekDays[today.getDay()]}, {today.toLocaleDateString('pt-BR')}
          </p>

          <div className="space-y-3">
            {isLoading ? (
               <p className="text-dark-400 text-center py-4 text-sm">Carregando...</p>
            ) : viewModeToday === 'trabalhando' ? (
              // LISTA DOS QUE ESTÃO TRABALHANDO
              workingToday.length === 0 ? (
                <p className="text-dark-400 text-center py-4 text-sm">Nenhum colaborador escalado para hoje.</p>
              ) : (
                workingToday.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-3 rounded-lg bg-dark-700/50 border border-dark-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{employee.name}</p>
                        <p className="text-xs text-primary-400 font-mono">{escalas[`${employee.id}_${todayStr}`]}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              // LISTA DOS QUE ESTÃO DE FOLGA
              offToday.length === 0 ? (
                <p className="text-dark-400 text-center py-4 text-sm">Nenhum colaborador de folga hoje.</p>
              ) : (
                offToday.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-3 rounded-lg bg-dark-700/50 border border-dark-600 opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Coffee className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{employee.name}</p>
                        <p className="text-xs text-dark-400">{employee.role}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Gerenciar Colaboradores Cadastrados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
             <p className="text-dark-400 col-span-full text-center py-12">Carregando...</p>
          ) : employees.length === 0 ? (
             <p className="text-dark-400 col-span-full text-center py-12">Nenhum colaborador cadastrado.</p>
          ) : (
            employees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{employee.name}</p>
                      <p className="text-sm text-dark-400">{employee.role}</p>
                    </div>
                    {employee.isOnCall && (
                      <span className="badge badge-warning">
                        <Moon className="w-3 h-3 mr-1" />
                        Sobreaviso
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-600">
                  <button
                    onClick={() => handleOpenModal(employee)}
                    className="btn-secondary flex-1 justify-center py-1.5 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Editar Perfil
                  </button>
                  <button
                    onClick={() => handleDeleteColaborador(employee.id)}
                    className="btn-danger px-3 py-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Nome do colaborador"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Cargo *</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field"
              placeholder="Ex: Técnico de Suporte"
            />
          </div>
          <div className="flex items-center pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOnCall}
                onChange={(e) => setFormData({ ...formData, isOnCall: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-dark-300">Regime de Sobreaviso (Plantão Fim de Semana)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSaveColaborador} className="btn-primary">
              {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}