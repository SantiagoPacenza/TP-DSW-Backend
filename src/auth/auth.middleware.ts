import { Request, Response, NextFunction } from 'express';
import { RolUsuario } from '../usuario/usuario.entity.js';
import jwt from 'jsonwebtoken';

// Middleware de verificación del token.

// Guardamos la clave secreta en el archivo .env como variable de entorno y la accedemos así:
const SECRET_KEY_JWT = process.env.SECRET_KEY_JWT || 'clave_por_defecto';
// Se suele usar una cadena de texto larga, aleatoria y sin mucho sentido para que sea imposible de adivinar por fuerza bruta.

export const verificarToken = (req: Request, res: Response, next: NextFunction) => {

    // Guarda el encabezado de autorización
    const authHeader = req.headers['authorization'];
    
    // Si está vacío es porque el token no está
    if (!authHeader) {
        return res.status(403).json({ message: 'Token no proporcionado. Acceso denegado.' });
    }

    // Obtenemos el token de adentro del encabezado
    const token = authHeader.split(' ')[1]; // Formato "Bearer TOKEN"
    
    // Verificamos que sea un token válido actualmente
    jwt.verify(token, SECRET_KEY_JWT, (err, decoded) => {

        if (err) {
            return res.status(401).json({ message: 'Token inválido o expirado.' });
        }
        
        // Adjuntamos los datos decodificados al request.
        // Esto sirve para acceder a los datos que llegan en el token desde el front. Aquí en el middleware se
        // descifra el token y se guardan los datos en req.user.
        // Por ejemplo, si se necesita saber qué usuario exacto está pidiendo crear una rutina o ver sus datos, en el 
        // controlador se podrá hacer esto:
        // const usuarioId = (req.user as any).id; 
        // const rolUsuario = (req.user as any).rol;
        (req as any).usuario = decoded;
        next();

        // "req as any":
        // Por defecto, Express tiene tipado un objeto Request estándar. Ese objeto Request sabe que existen propiedades 
        // como req.body, req.params o req.query, pero no sabe que existe una propiedad llamada user.
        // Si tú intentaras escribir simplemente req.user = decoded; sin el as any, TypeScript te subrayaría la palabra 
        // user en rojo y te tiraría un error de compilación diciendo: "Oye, la propiedad user no existe en el tipo Request".
        // as any es un "puente" o asercion de tipo. Le estás diciendo a TypeScript:
        // "Confía en mí. Trata temporalmente a este objeto req como si fuera de tipo any (cualquier cosa) para que me 
        // deje inventar y agregarle la propiedad 'user' sin tirar error".

    });

};

// Middleware para verificar rol de los administradores
export const verificarRolAdmin = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || usuario.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    next(); // Si es admin, lo dejamos pasar
};

// Middleware para verificar rol de los entrenadores
export const verificarRolEntrenador = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || usuario.rol !== RolUsuario.ENTRENADOR) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Entrenador.' });
    }

    next();
};

// Middleware para verificar rol de los clientes
export const verificarRolCliente = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || usuario.rol !== RolUsuario.CLIENTE) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Cliente.' });
    }

    next();
};

// Middleware que permite acceso solo a Admin o Cliente
export const verificarAdminCliente = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || ![RolUsuario.ADMIN, RolUsuario.CLIENTE].includes(usuario.rol)) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador o Cliente.' });
    }

    next();
};

// Middleware que permite acceso solo a Admin o Entrenador
export const verificarAdminEntrenador = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || ![RolUsuario.ADMIN, RolUsuario.ENTRENADOR].includes(usuario.rol)) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador o Entrenador.' });
    }

    next();
};

// Middleware que permite acceso solo a Cliente o Entrenador
export const verificarClienteEntrenador = (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.body.usuario as any;

    if (!usuario || ![RolUsuario.CLIENTE, RolUsuario.ENTRENADOR].includes(usuario.rol)) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Cliente o Entrenador.' });
    }

    next();
};