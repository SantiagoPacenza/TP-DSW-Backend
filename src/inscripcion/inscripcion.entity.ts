import { Entity, Enum, Property, ManyToOne } from '@mikro-orm/core';
import type { Usuario } from '../usuario/usuario.entity.js';
import type { Clase } from '../clase/clase.entity.js';

// Al inscribirse nace activa. El administrador puede finalizarla; al cancelar se elimina.
export enum EstadoInscripcion {
  ACTIVA = 'activa',
  FINALIZADA = 'finalizada',
}
@Entity()
export class Inscripcion {
  // PK: cliente + clase. Tras cancelar se puede crear una nueva inscripción.

  // Relación: Muchas inscripciones pertenecen a 1 solo Cliente (obligatorio)
  @ManyToOne(() => 'Usuario', {
    primary: true,
    nullable: false,
    deleteRule: 'cascade',
  })
  cliente!: Usuario;

  // restrict evita que se borre una clase si tiene inscripciones asociadas.
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
