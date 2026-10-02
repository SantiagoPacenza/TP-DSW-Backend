import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js'; //configuracion central de la bdd
import { Disciplina } from './disciplina.entity.js'; //ORM sepa a que tabla nos referimos

const em = orm.em;  //Gestor de entidades. Herramienta de mickroORM para hablar con la BDD

// Obtener todas las disciplinas
const findAll = async (req: Request, res: Response) => {
  try {
    const disciplinas = await em.find(Disciplina, {});
    return res.status(200).json({ message: 'Todas las disciplinas', data: disciplinas });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener una disciplina por ID
const findOne = async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id);
    const disciplina = await em.findOneOrFail(Disciplina, { id });
    return res.status(200).json({ message: 'Disciplina encontrada', data: disciplina });
  } catch (error: any) {
    return res.status(404).json({ message: 'Disciplina no encontrada' });
  }
};

// Crear una disciplina
const add = async (req: Request, res: Response) => {
  try {
    const disciplina = em.create(Disciplina, req.body);
    await em.flush();
    return res.status(201).json({ message: 'Disciplina creada', data: disciplina });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar una disciplina
const update = async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id);
    const disciplinaToUpdate = await em.findOneOrFail(Disciplina, { id });
    em.assign(disciplinaToUpdate, req.body);
    await em.flush();
    return res.status(200).json({ message: 'Disciplina actualizada', data: disciplinaToUpdate });
  } catch (error: any) {
    return res.status(404).json({ message: 'Disciplina no encontrada para actualizar' });
  }
};

// Eliminar una disciplina
const remove = async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id);
    const disciplina = await em.findOneOrFail(Disciplina, { id });
    await em.removeAndFlush(disciplina);
    return res.status(200).json({ message: 'Disciplina eliminada con éxito' });
  } catch (error: any) {
    return res.status(404).json({ message: 'Disciplina no encontrada para eliminar' });
  }
};

export { findAll, findOne, add, update, remove };