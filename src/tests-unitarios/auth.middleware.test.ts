// Importamos las funciones de Vitest para armar y comprobar las pruebas
import { describe, test, expect, vi } from 'vitest';
// Librería para firmar tokens de prueba y simular un inicio de sesión
import jwt from 'jsonwebtoken';
// Importamos los middlewares y la clave secreta del sistema de autenticación
import {
  verificarToken,
  isAdmin,
  SECRET_KEY_JWT,
} from '../auth/auth.middleware.js';
// Importamos los roles de usuario (admin, cliente, entrenador)
import { RolUsuario } from '../usuario/usuario.entity.js';



//
// TEST UNITARIO de Seguridad JWT y control de roles.
//

// Test unitario automatizado: prueba los middlewares de forma aislada con objetos falsos
// (req, res, next), sin levantar un servidor HTTP ni consultar la base de datos.



describe('Middlewares de autenticación y autorización', () => {
  test('verificarToken rechaza con 401 si no se envía cabecera Authorization', () => {
    // Preparamos una petición falsa sin cabecera de autorización
    const req = { headers: {} } as any;
    // Preparamos una respuesta falsa que permite encadenar res.status(...).json(...)
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    // Preparamos "next" (la función que deja pasar al siguiente paso) como espía
    const next = vi.fn();

    // Ejecutamos el middleware bajo prueba
    verificarToken(req, res, next);

    // Comprobamos que haya devuelto estado 401 (no autorizado) y frenado el paso
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('verificarToken decodifica el usuario y llama a next() con token válido', () => {
    // Creamos un token JWT válido de prueba para un usuario cliente con id 1
    const token = jwt.sign(
      { id: 1, rol: RolUsuario.CLIENTE },
      SECRET_KEY_JWT,
      { algorithm: 'HS256' },
    );
    // Simulamos que el cliente envía el token en el formato estándar "Bearer <token>"
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    // Ejecutamos el middleware
    verificarToken(req, res, next);

    // Verificamos que dejó pasar (llamó a next una vez) y guardó los datos del usuario
    expect(next).toHaveBeenCalledOnce();
    expect(req.usuario.id).toBe(1);
    expect(req.usuario.rol).toBe(RolUsuario.CLIENTE);
  });

  test('isAdmin responde 403 si el usuario autenticado tiene rol CLIENTE', () => {
    // Simulamos un usuario ya autenticado pero con rol "cliente"
    const req = { usuario: { id: 5, rol: RolUsuario.CLIENTE } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    // Probamos el middleware que exige ser administrador
    isAdmin(req, res, next);

    // Comprobamos que bloquea con 403 (prohibido) y no deja avanzar
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});