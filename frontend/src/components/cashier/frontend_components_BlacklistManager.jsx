import React, { useState, useEffect } from 'react';
import { UserX, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { getBlacklist, addToBlacklist, removeFromBlacklist } from '../../services/api';

const BlacklistManager = () => {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    document_number: '',
    reason: '',
    additional_notes: ''
  });

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      const data = await getBlacklist();
      setBlacklist(data);
    } catch (error) {
      console.error('Error al cargar lista negra:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.document_number || !formData.reason) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await addToBlacklist(formData);
      alert('✅ Persona agregada a lista negra');
      setFormData({ full_name: '', document_number: '', reason: '', additional_notes: '' });
      setShowAddForm(false);
      loadBlacklist();
    } catch (error) {
      console.error('Error al agregar a lista negra:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`¿Remover a ${name} de la lista negra?`)) {
      return;
    }

    try {
      await removeFromBlacklist(id);
      alert(`✅ Persona removida de lista negra`);
      loadBlacklist();
    } catch (error) {
      console.error('Error al remover:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-red-600">
          <UserX className="w-6 h-6" />
          Lista Negra de Huéspedes ({blacklist.length})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-danger flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar a Lista Negra
        </button>
      </div>

      {/* Formulario para agregar */}
      {showAddForm && (
        <div className="card bg-red-50 border-red-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Reportar Mal Huésped
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Documento (CI/Pasaporte) *
                </label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Razón del Reporte *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="input-field"
                rows="3"
                placeholder="Ej: Daños a la propiedad, comportamiento inapropiado, impago..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Notas Adicionales
              </label>
              <textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                className="input-field"
                rows="2"
                placeholder="Información adicional relevante..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-danger">
                Agregar a Lista Negra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de lista negra */}
      {blacklist.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-red-100">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Razón</th>
                <th className="px-4 py-3 text-left">Reportado</th>
                <th className="px-4 py-3 text-left">Por</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((person) => (
                <tr key={person.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{person.full_name}</td>
                  <td className="px-4 py-3">{person.document_number}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs truncate" title={person.reason}>
                      {person.reason}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(person.reported_at).toLocaleDateString('es-BO')}
                  </td>
                  <td className="px-4 py-3 text-sm">{person.reported_by_name}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleRemove(person.id, person.full_name)}
                      className="text-red-600 hover:text-red-800"
                      title="Remover de lista negra"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12">
          <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay personas en la lista negra</p>
        </div>
      )}
    </div>
  );
};

export default BlacklistManager;