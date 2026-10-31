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
  const authHeader = req.headers['authorization'];

    if (!authHeader) {
     return res
        .status(401)
        .json({ message: 'Token no proporcionado. Acceso denegado.' });
    }

    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) {
      return res
        .status(401)
        .json({ message: 'Formato de token inválido. Use: Bearer <token>.' });
    }

    const token = partes[1];

    jwt.verify(
      token,
      SECRET_KEY_JWT,
      { algorithms: ['HS256'] },
      (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .json({ message: 'Token inválido o expirado.' });
        }

        (req as any).usuario = decoded;
        next();
      },
    );
  };



// Middleware opcional: el error queda asociado al usuario cuando hay un token válido. Si no lo hay, se registra 
// sin usuario identificado, esto para reportar errores antes de iniciar sesion o cuando el token ya vencio.
export const verificarTokenOpcional = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];

  // Si no hay encabezado de autorización, continúa como anónimo
  if (!authHeader) {
    return next();
  }

  // Si el formato no es "Bearer <token>", continúa sin frenar
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) {
    return next();
  }

  jwt.verify(
    partes[1],
    SECRET_KEY_JWT,
    { algorithms: ['HS256'] },
    (err, decoded) => {
      // Si el token era válido y no expiró, le adjuntamos el usuario al request
      if (!err && decoded) {
        (req as any).usuario = decoded;
      }
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
