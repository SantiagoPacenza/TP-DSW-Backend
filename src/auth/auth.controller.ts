import { Request, Response } from 'express';
import { manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { SECRET_KEY_JWT } from './auth.middleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const em = orm.em;

// ENDPOINT DE REGISTRO (Usa bcrypt para hashear)
export async function autoregistroCliente(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    /// Hasheamos la contraseña y forzamos el rol cliente
    datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);
    datos.rol = RolUsuario.CLIENTE;

    const usuario = em.create(Usuario, datos);
    await em.flush(); // Acá MySQL rechaza los duplicados (-> 409)

    res
      .status(201)
      .json({ message: 'Usuario registrado con éxito!', data: usuario });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'El nombre de usuario o el email ya está en uso',
      req,
    });
  }
}

// ENDPOINT DE LOGIN (bcrypt para comparar y JWT para firmar)
export async function loguearse(req: Request, res: Response) {
  try {
    const { email, contrasenia } = req.body ?? {};

    // Validar que email y contrasenia sean strings no vacíos antes de consultar la BD o ejecutar bcrypt
    if (
      typeof email !== 'string' ||
      typeof contrasenia !== 'string' ||
      !email.trim() ||
      !contrasenia
    ) {
      return res
        .status(400)
        .json({ message: 'El email y la contraseña son obligatorios.' });
    }

    const emailNormalizado = email.trim().toLowerCase();

    // Busca en base de datos usando el email único del usuario
    const usuario = await em.findOne(Usuario, { email: emailNormalizado });
    if (!usuario) {
      return res
        .status(401)
        .json({ message: 'Email o contraseña incorrectos.' });
    }

    // Validación segura de contraseña (compara texto plano ingresado con el hash guardado en db)
    const contraseniaEsCorrecta = await bcrypt.compare(
      contrasenia,
      usuario.contrasenia,
    );

    if (!contraseniaEsCorrecta) {
      return res.status(401).json({
        message: 'Email o contraseña incorrectos.',
      });
    }

    // Si son correctas las credenciales generamos token jwt para el usuario logueado.
    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
      },
      SECRET_KEY_JWT,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    // Lo enviamos en la respuesta
    return res.status(200).json({ message: '¡Login exitoso!', data: token });
  } catch (error) {
    manejarError(res, error, { req });
  }
}
