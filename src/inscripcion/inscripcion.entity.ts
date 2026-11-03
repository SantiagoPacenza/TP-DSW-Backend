import { Entity, Enum, Property, ManyToOne } from '@mikro-orm/core';
import type { Usuario } from '../usuario/usuario.entity.js';
import type { Clase } from '../clase/clase.entity.js';

// Una inscripción está activa desde que el usuario cliente se inscribe hasta que terminan las clases de la disciplina
// a la que se asiste. Luego pasa a ser finalizada.
export enum EstadoInscripcion {
  ACTIVA = 'activa',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
}
@Entity()
export class Inscripcion {
  // PK: cliente + clase. Si se vuelve a inscribir, se reactiva la misma fila.

  // Relación: Muchas inscripciones pertenecen a 1 solo Cliente (obligatorio)
  @ManyToOne(() => 'Usuario', {
    primary: true,
    nullable: false,
    deleteRule: 'cascade',
  })
  cliente!: Usuario;

  // deleteRule: 'restric' evita que se borre una clase si tiene inscripciones activas.
  // Relación: Muchas inscripciones pertenecen a 1 sola Clase (obligatorio)
  @ManyToOne(() => 'Clase', {
    primary: true,
    nullable: false,
    deleteRule: 'restrict',
  })
  clase!: Clase;

  // fechaInscripcion manejado como string plano 'YYYY-MM-DD': evita problemas de zona horaria.
  @Property({ type: 'date', nullable: false })
  fechaInscripcion!: string;

  @Enum(() => EstadoInscripcion)
  estadoInscripcion: EstadoInscripcion = EstadoInscripcion.ACTIVA;
}
