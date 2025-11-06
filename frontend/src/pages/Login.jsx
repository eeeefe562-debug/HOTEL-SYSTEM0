import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hotel, User, Lock, Mail, Building2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [userType, setUserType] = useState('admin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    admin_id: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData, userType);

    if (result.success) {
      if (userType === 'admin') {
        navigate('/admin');
      } else {
        navigate('/cashier');
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Hotel className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Sistema Hotelero
          </h1>
          <p className="text-blue-100">
            Gestión integral de hoteles
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Selector de tipo de usuario */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setUserType('admin')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                userType === 'admin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Building2 className="w-5 h-5 mx-auto mb-1" />
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setUserType('cashier')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                userType === 'cashier'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User className="w-5 h-5 mx-auto mb-1" />
              Cajero
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {userType === 'admin' ? (
              <>
                <div>
                  <label className="label">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                    placeholder="admin@hotel.com"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">
                    <User className="w-4 h-4 inline mr-2" />
                    Usuario
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="input"
                    placeholder="cajero1"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    ID Administrador
                  </label>
                  <input
                    type="number"
                    name="admin_id"
                    value={formData.admin_id}
                    onChange={handleChange}
                    className="input"
                    placeholder="1"
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Credenciales de prueba */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-2">
              Credenciales de prueba:
            </p>
            <p className="text-xs text-blue-600">
              <strong>Admin:</strong> admin@hotel.com / password
            </p>
            <p className="text-xs text-blue-600">
              <strong>Cajero:</strong> cajero1 / Cajero123! / ID: 1
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-6">
          © 2025 Sistema Hotelero. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;