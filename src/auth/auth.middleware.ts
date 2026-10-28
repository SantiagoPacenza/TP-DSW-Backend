import { Request, Response, NextFunction } from 'express';
import { RolUsuario } from '../usuario/usuario.entity.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Middleware de verificación del token.

// Guardamos la clave secreta en el archivo .env como variable de entorno y exigimos que esté definida:
export const SECRET_KEY_JWT = process.env.SECRET_KEY_JWT as string;
if (!SECRET_KEY_JWT) {
  throw new Error(
    'Falta definir la variable de entorno SECRET_KEY_JWT en el archivo .env',
  );
}
// Se suele usar una cadena de texto larga, aleatoria y sin mucho sentido para que sea imposible de adivinar por fuerza bruta.

export const verificarToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Guarda el encabezado de autorización
  const authHeader = req.headers['authorization'];

  // Si está vacío es porque el token no está (401 Unauthorized)
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Token no proporcionado. Acceso denegado.' });
  }

  // Validamos que el encabezado respete el formato "Bearer <token>"
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) {
    return res
      .status(401)
      .json({ message: 'Formato de token inválido. Use: Bearer <token>.' });
  }

  const token = partes[1];

  // Verificamos que sea un token válido actualmente restringiendo el algoritmo aceptado a HS256
  jwt.verify(
    token,
    SECRET_KEY_JWT,
    { algorithms: ['HS256'] },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      // Adjuntamos los datos decodificados al request, para poder acceder a los
      // datos que llegan en el token desde el front.
      (req as any).usuario = decoded;
      next();
    },
  );
};

// Fábrica de middlewares para verificar roles leyendo siempre de req.usuario (decodificado del JWT)
export const permitirRoles = (rolesPermitidos: RolUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }
    next();
  };
};

export const isAdmin = permitirRoles([RolUsuario.ADMIN]);
export const isEntrenador = permitirRoles([RolUsuario.ENTRENADOR]);
export const isCliente = permitirRoles([RolUsuario.CLIENTE]);
export const isAdminCliente = permitirRoles([
  RolUsuario.ADMIN,
  RolUsuario.CLIENTE,
]);
export const isAdminEntrenador = permitirRoles([
  RolUsuario.ADMIN,
  RolUsuario.ENTRENADOR,
]);
export const isClienteEntrenador = permitirRoles([
  RolUsuario.CLIENTE,
  RolUsuario.ENTRENADOR,
]);
