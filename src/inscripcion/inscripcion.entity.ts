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
  // PK: usuario (tipoCliente) + clase + fechaInscripcion

  // Relación: Muchas inscripciones pertenecen a 1 solo Usuario (obligatorio)
  @ManyToOne(() => 'Usuario', {
    primary: true,
    nullable: false,
    deleteRule: 'cascade',
  })
  usuario!: Usuario;

  // Relación: Muchas inscripciones pertenecen a 1 sola Clase (obligatorio)
  @ManyToOne(() => 'Clase', {
    primary: true,
    nullable: false,
    deleteRule: 'cascade',
  })
  clase!: Clase;

  // deleteRule: 'cascade' para que al borrar una Clase o un Usuario se borren sus inscripciones asociadas.

  // fechaInscripcion manejado como string plano 'YYYY-MM-DD': evita problemas de zona horaria.
  @Property({ primary: true, type: 'date', nullable: false })
  fechaInscripcion!: string;

  @Enum(() => EstadoInscripcion)
  estadoInscripcion!: EstadoInscripcion;
}
