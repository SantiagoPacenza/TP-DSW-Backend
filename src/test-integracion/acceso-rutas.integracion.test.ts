// Herramientas de Vitest para agrupar pruebas y verificar resultados
import { describe, test, expect } from 'vitest';
// Librería para enviar peticiones HTTP de prueba a una app de Express sin abrir un puerto manual
import request from 'supertest';
// Librería para generar tokens JWT de prueba
import jwt from 'jsonwebtoken';
// Express para armar una aplicación de prueba con rutas y middlewares reales
import express from 'express';
// Tus middlewares reales de autenticación y autorización por rol
import {
  verificarToken,
  isAdmin,
  SECRET_KEY_JWT,
} from '../auth/auth.middleware.js';
// Enum con los roles del sistema
import { RolUsuario } from '../usuario/usuario.entity.js';



//
// TEST DE INTEGRACIÓN: Seguridad y control de acceso por rol en rutas HTTP.
//

// Es un test de integración porque no pruebo una función suelta: se arma una petición HTTP real con supertest (librería 
// que envía peticiones HTTP contra una app de Express en memoria y lee su respuesta sin tener que abrir un puerto en 
// el servidor) contra una ruta de Express y se comprueba cómo trabajan encadenados verificarToken, isAdmin y el controlador 
// final devolviendo 401, 403 o 200.



// Creamos una app de Express mínima solo para este test de integración.
// Así probamos el flujo completo (petición HTTP -> verificarToken -> isAdmin -> respuesta)
// sin tocar la base de datos ni disparar el escaneo de entidades de MikroORM.
function crearAppDePrueba() {
  const app = express();
  app.use(express.json());

  // Ruta protegida: requiere un token JWT válido (cualquier rol autenticado)
  app.get('/api/perfil-prueba', verificarToken, (req, res) => {
    res.status(200).json({
      ok: true,
      usuario: (req as any).usuario,
    });
  });

  // Ruta restringida a administradores: requiere token válido AND rol ADMIN
  app.get('/api/panel-admin-prueba', verificarToken, isAdmin, (req, res) => {
    res.status(200).json({
      ok: true,
      adminId: (req as any).usuario.id,
    });
  });

  return app;
}

describe('Integración de middlewares de seguridad en rutas HTTP', () => {
  const app = crearAppDePrueba();

  test('rechaza con 401 si se consulta una ruta protegida sin token', async () => {
    // Hacemos una petición GET real sin cabecera Authorization
    const respuesta = await request(app).get('/api/perfil-prueba');

    expect(respuesta.status).toBe(401);
  });

  test('rechaza con 403 si un CLIENTE intenta entrar a una ruta exclusiva de ADMIN', async () => {
    // Generamos un token válido pero con rol "cliente"
    const tokenCliente = jwt.sign(
      { id: 10, rol: RolUsuario.CLIENTE },
      SECRET_KEY_JWT,
      { algorithm: 'HS256' },
    );

    const respuesta = await request(app)
      .get('/api/panel-admin-prueba')
      .set('Authorization', `Bearer ${tokenCliente}`);

    expect(respuesta.status).toBe(403);
  });

  test('permite el acceso con 200 si un ADMIN envía un token válido', async () => {
    // Generamos un token válido con rol "admin"
    const tokenAdmin = jwt.sign(
      { id: 1, rol: RolUsuario.ADMIN },
      SECRET_KEY_JWT,
      { algorithm: 'HS256' },
    );

    const respuesta = await request(app)
      .get('/api/panel-admin-prueba')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      ok: true,
      adminId: 1,
    });
  });
});