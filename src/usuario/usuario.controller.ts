import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import bcrypt from 'bcryptjs';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from './usuario.entity.js';

const em = orm.em;

function sanitizeUsuarioInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];
  const maxCaracteres: Record<string, number> = {
    nombre: 30,
    apellido: 30,
    nombreUsuario: 30,
    email: 100,
  };

  for (const campo of Object.keys(maxCaracteres)) {
    const valor = body[campo];
    if (valor === undefined) {
      if (req.method !== 'PATCH') errores.push(`El ${campo} es obligatorio`);
    } else if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El ${campo} debe ser un texto que no esté vacío`);
    } else if (valor.trim().length > maxCaracteres[campo]) {
      errores.push(
        `El ${campo} no puede tener más de ${maxCaracteres[campo]} caracteres`,
      );
    }
  }

  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof body.email === 'string' && !formatoEmail.test(body.email.trim())) {
    errores.push('El email no tiene un formato válido');
  }

  if (body.rol === undefined) {
    if (req.method !== 'PATCH') errores.push('El rol es obligatorio');
  } else if (!Object.values(RolUsuario).includes(body.rol)) {
    errores.push(
      `El rol debe ser uno de: ${Object.values(RolUsuario).join(', ')}`,
    );
  }

  if (body.fechaNacimiento === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de nacimiento es obligatoria');
    }
  } else if (
    typeof body.fechaNacimiento !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaNacimiento)
  ) {
    errores.push('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
  } else {
    const fecha = new Date(body.fechaNacimiento);

    if (
      isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== body.fechaNacimiento
    ) {
      errores.push('La fecha de nacimiento no es una fecha válida');
    } else if (fecha > new Date()) {
      errores.push('La fecha de nacimiento no puede ser en el futuro');
    }
  }

  if (body.contrasenia === undefined) {
    if (req.method === 'POST') errores.push('La contraseña es obligatoria');
  } else if (
    typeof body.contrasenia !== 'string' ||
    body.contrasenia.trim().length < 6
  ) {
    errores.push('La contraseña debe ser un texto de al menos 6 caracteres');
  }

  const tel = body.telefono;
  if (tel !== undefined && tel !== null && typeof tel !== 'string') {
    errores.push('El teléfono debe ser un texto');
  } else if (typeof tel === 'string' && tel.trim().length > 25) {
    errores.push('El teléfono no puede tener más de 25 caracteres');
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  const datosLimpios: Record<string, unknown> = {
    rol: body.rol,
    nombre: body.nombre?.trim(),
    apellido: body.apellido?.trim(),
    fechaNacimiento: body.fechaNacimiento,
    nombreUsuario: body.nombreUsuario?.trim(),
    email: body.email?.trim(),
    contrasenia: body.contrasenia,
    telefono: body.telefono,
  };
  Object.keys(datosLimpios).forEach((campo) => {
    if (datosLimpios[campo] === undefined) delete datosLimpios[campo];
  });

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

async function findAll(_req: Request, res: Response) {
  try {
    const usuarios = await em.find(Usuario, {});
    res.status(200).json({ message: 'Usuarios encontrados', data: usuarios });
  } catch (error) {
    manejarError(res, error);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({ message: 'Usuario encontrado', data: usuario });
  } catch (error) {
    manejarError(res, error);
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    // Se guarda el hash de la contraseña, nunca el texto original
    datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);

    const usuario = em.create(Usuario, datos);
    await em.flush(); // Acá MySQL rechaza los duplicados (-> 409)
    res.status(201).json({ message: 'Usuario creado', data: usuario });
  } catch (error) {
    manejarError(res, error, 'El nombre de usuario o el email ya está en uso');
  }
}

// Sirve para PUT y PATCH
async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const datos = req.body.sanitizedInput;
    // Solo se hashea si vino una contraseña nueva
    if (datos.contrasenia) {
      datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);
    }
    em.assign(usuario, datos);
    await em.flush(); // 409 si nombreUsuario o email es el mismo que el de otro usuario
    res.status(200).json({ message: 'Usuario actualizado', data: usuario });
  } catch (error) {
    manejarError(res, error, 'El nombre de usuario o el email ya está en uso');
  }
}

// Se busca antes de borrar para poder responder 404 si no existe (getReference no avisa)
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await em.remove(usuario).flush();
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    manejarError(res, error);
  }
}

export { sanitizeUsuarioInput, findAll, findOne, add, update, remove };
