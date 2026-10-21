import {
  Entity,
  Enum,
  Property,
  OneToMany,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Membresia } from '../membresia/membresia.entity.js';
import type { Inscripcion } from '../inscripcion/inscripcion.entity.js';
import type { Solicitud } from '../solicitud/solicitud.entity.js';
import type { Clase } from '../clase/clase.entity.js';
import type { Disciplina } from '../disciplina/disciplina.entity.js';
import type { Rutina } from '../rutina/rutina.entity.js';

export enum RolUsuario {
  ADMIN = 'admin',
  CLIENTE = 'cliente',
  ENTRENADOR = 'entrenador',
}

@Entity()
export class Usuario extends BaseEntity {
  @Enum(() => RolUsuario)
  rol!: RolUsuario;

  @Property({ length: 30, nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  apellido!: string;

  @Property({ type: 'date' })
  fechaNacimiento!: string;

  @Property({ unique: true })
  nombreUsuario!: string;

  @Property({ length:100, unique: true })
  email!: string;

  @Property({ hidden: true })
  contrasenia!: string;

  @Property({ nullable: true })
  telefono?: string;

  // Relación: 1 Usuario (con rol cliente) puede tener N Membresías (tipamos explícitamente el parámetro)
  @OneToMany(() => 'Membresia', (membresia: Membresia) => membresia.usuario)
  membresias = new Collection<Membresia>(this);

  // Relación: 1 Usuario (con rol cliente) puede tener N Inscripciones
  @OneToMany(
    () => 'Inscripcion',
    (inscripcion: Inscripcion) => inscripcion.usuario,
  )
  inscripciones = new Collection<Inscripcion>(this);

  // Relación: 1 Usuario puede tener N Solicitudes
  @OneToMany(() => 'Solicitud', (solicitud: Solicitud) => solicitud.cliente)
  solicitudes = new Collection<Solicitud>(this);
  // Relación: 1 Usuario (con rol entrenador) tiene asociadas las N Clases que dicta
  @OneToMany(() => 'Clase', (clase: Clase) => clase.usuario)
  clases = new Collection<Clase>(this);

  // Relación Muchos a Muchos: Un Usuario esta habilitado para muchas Disciplinas (y es el dueño de la relación)
  @ManyToMany(
    () => 'Disciplina',
    (disciplina: Disciplina) => disciplina.usuarios,
    { owner: true },
  )
  disciplinas = new Collection<Disciplina>(this);

  @OneToMany(() => 'Rutina', (rutina: Rutina) => rutina.entrenador)
  rutinas = new Collection<Rutina>(this);
}
