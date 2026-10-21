import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import bcrypt from 'bcryptjs';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from './usuario.entity.js';
import { Disciplina } from '../disciplina/disciplina.entity.js';

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

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  for (const campo of Object.keys(maxCaracteres)) {
    const valor = body[campo];

    if (valor === undefined) {
      if (req.method === 'POST' || req.method === 'PUT') {
        errores.push(`El campo ${campo} es obligatorio`);
      }
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
  } else if (typeof body.contrasenia !== 'string') {
    errores.push('La contraseña debe ser un texto');
  } else if (body.contrasenia.trim() === '') {
    errores.push('La contraseña no puede estar vacía ni ser solo espacios');
  } else if (body.contrasenia.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  } else if (body.contrasenia.length > 72) {
    errores.push('La contraseña no puede tener más de 72 caracteres');
  } 
  /*Agregué este último porque el algoritmo de bcrypt tiene un limite de 72byte
  Si se supera, puede ignorar parte de la contraseña y provocar que dos contraseñas 
  diferentes se consideren equivalentes
  */

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
    email: body.email?.trim().toLowerCase(),
    contrasenia: body.contrasenia,
    telefono:
    typeof body.telefono === 'string'
      ? body.telefono.trim() || null
      : body.telefono,
  };

  // Agregar contraseña solo si vino en el body (en PUT/PATCH, si se actualizan otros datos no viene y es undefined)
  if(body.contrasenia !== undefined){
    datosLimpios.contrasenia = body.contrasenia;
  }

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

    if (datos.rol !== undefined && datos.rol !== usuario.rol) {
    return res.status(409).json({
    message:
      'No se puede cambiar el rol de un usuario existente. ' +
      'Debe crearse un nuevo usuario con el rol correspondiente.',
      });
    }

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


async function actualizarDisciplinas(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const { disciplinaIds } = req.body ?? {};

    // Validar que llegue una lista de IDs válidos.
    if (
      !Array.isArray(disciplinaIds) ||
      !disciplinaIds.every(
        (id: unknown) =>
          typeof id === 'number' &&
          Number.isInteger(id) &&
          id > 0,
      ) ||
      new Set(disciplinaIds).size !== disciplinaIds.length
    ) {
      return res.status(400).json({
        message:
          'disciplinaIds debe ser una lista de IDs enteros positivos sin duplicados',
      });
    }

    // Buscar al usuario.
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado',
      });
    }

    // Solo un entrenador puede tener disciplinas habilitadas.
    if (usuario.rol !== RolUsuario.ENTRENADOR) {
      return res.status(409).json({
        message:
          'Solo se pueden asignar disciplinas a un usuario con rol entrenador',
      });
    }

    // Buscar las disciplinas recibidas.
    const disciplinas = await em.find(Disciplina, {
      id: { $in: disciplinaIds },
    });

    // Comprobar que todas existan.
    if (disciplinas.length !== disciplinaIds.length) {
      return res.status(400).json({
        message: 'Una o más disciplinas no existen',
      });
    }

    // Reemplazar las disciplinas habilitadas del entrenador.
    usuario.disciplinas.set(disciplinas);

    // Guardar los cambios en la base de datos.
    await em.flush();

    return res.status(200).json({
      message: 'Disciplinas del entrenador actualizadas correctamente',
      data: {
        id: usuario.id,
        disciplinaIds: disciplinas.map((disciplina) => disciplina.id),
      },
    });
  } catch (error) {
    manejarError(res, error);
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

export { sanitizeUsuarioInput, findAll, findOne, add, update, remove, actualizarDisciplinas };
