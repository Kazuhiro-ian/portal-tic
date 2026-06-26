import { useState } from 'react';
import { Plus, Edit, Trash2, Phone, UserCheck, ChevronLeft, ChevronRight, Clock, Moon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

const weekDays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export function EmployeeSchedule() {
  const [employees, setEmployees] = useLocalStorage('ithub_employees', []);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    shift: '08:00 - 17:00',
    isOnCall: false,
    workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
  });

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

  const workingToday = employees.filter((e) => {
    const todayName = weekDays[today.getDay()];
    return e.workingDays.includes(todayName);
  });

  const handleOpenModal = (employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        role: employee.role,
        shift: employee.shift,
        isOnCall: employee.isOnCall,
        workingDays: [...employee.workingDays],
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        role: '',
        shift: '08:00 - 17:00',
        isOnCall: false,
        workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.role.trim()) return;

    if (editingEmployee) {
      setEmployees(
        employees.map((e) =>
          e.id === editingEmployee.id ? { ...e, ...formData } : e
        )
      );
    } else {
      const newEmployee = {
        id: Date.now().toString(),
        ...formData,
      };
      setEmployees([...employees, newEmployee]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este colaborador?')) {
      setEmployees(employees.filter((e) => e.id !== id));
    }
  };

  const toggleWorkingDay = (day) => {
    const newDays = formData.workingDays.includes(day)
      ? formData.workingDays.filter((d) => d !== day)
      : [...formData.workingDays, day];
    setFormData({ ...formData, workingDays: newDays });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Escala de Colaboradores</h1>
          <p className="text-dark-400 mt-1">{employees.length} colaboradores cadastrados</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="table-header w-40">Colaborador</th>
                    {weekDays.map((day, index) => {
                      const isToday = weekDates[index].toDateString() === today.toDateString();
                      return (
                        <th
                          key={day}
                          className={`table-header text-center ${isToday ? 'bg-primary-500/10' : ''}`}
                        >
                          <div>
                            <p className={isToday ? 'text-primary-400' : ''}>{day}</p>
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
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-dark-400">
                        Nenhum colaborador cadastrado
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
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
                        {weekDays.map((day, index) => {
                          const isWorking = employee.workingDays.includes(day);
                          const isToday = weekDates[index].toDateString() === today.toDateString();
                          return (
                            <td
                              key={day}
                              className={`table-cell text-center ${isToday ? 'bg-primary-500/5' : ''}`}
                            >
                              {isWorking ? (
                                <div className="flex flex-col items-center">
                                  <UserCheck className="w-5 h-5 text-green-400" />
                                  <span className="text-xs text-dark-400 mt-1">{employee.shift}</span>
                                </div>
                              ) : employee.isOnCall && (day === 'Sabado' || day === 'Domingo') ? (
                                <div className="flex flex-col items-center">
                                  <Phone className="w-5 h-5 text-yellow-400" />
                                  <span className="text-xs text-yellow-400 mt-1">Plantao</span>
                                </div>
                              ) : (
                                <span className="text-dark-500">-</span>
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

        <div className="card h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Trabalhando Hoje</h2>
          </div>
          <p className="text-dark-400 mb-4">
            {weekDays[today.getDay()]}, {today.toLocaleDateString('pt-BR')}
          </p>
          <div className="space-y-3">
            {workingToday.length === 0 ? (
              <p className="text-dark-400 text-center py-4">Nenhum colaborador</p>
            ) : (
              workingToday.map((employee) => (
                <div
                  key={employee.id}
                  className="p-3 rounded-lg bg-dark-700/50 border border-dark-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{employee.name}</p>
                      <p className="text-xs text-dark-400">{employee.shift}</p>
                    </div>
                  </div>
                  {employee.isOnCall && (
                    <span className="badge badge-warning mt-2">
                      <Moon className="w-3 h-3 mr-1" />
                      Sobreaviso
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Todos os Colaboradores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="p-4 rounded-lg bg-dark-700/50 border border-dark-600"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{employee.name}</p>
                  <p className="text-sm text-dark-400">{employee.role}</p>
                  <p className="text-xs text-dark-400 mt-1">{employee.shift}</p>
                </div>
                {employee.isOnCall && (
                  <span className="badge badge-warning">
                    <Moon className="w-3 h-3 mr-1" />
                    Sobreaviso
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-3 flex-wrap">
                {employee.workingDays.map((day) => (
                  <span key={day} className="text-xs bg-dark-600 text-dark-300 px-2 py-0.5 rounded">
                    {day.slice(0, 3)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-600">
                <button
                  onClick={() => handleOpenModal(employee)}
                  className="btn-secondary flex-1 justify-center py-1.5 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className="btn-danger px-3 py-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Ex: Tecnico de Suporte"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Horario/Turno</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="select-field"
              >
                <option value="08:00 - 17:00">08:00 - 17:00 (Comercial)</option>
                <option value="10:00 - 19:00">10:00 - 19:00 (2o Turno)</option>
                <option value="06:00 - 15:00">06:00 - 15:00 (1o Turno)</option>
                <option value="12:00 - 21:00">12:00 - 21:00 (3o Turno)</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isOnCall}
                  onChange={(e) => setFormData({ ...formData, isOnCall: e.target.checked })}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-dark-300">Regime de Sobreaviso (Plantao Fim de Semana)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">Dias de Trabalho</label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    formData.workingDays.includes(day)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingEmployee ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
