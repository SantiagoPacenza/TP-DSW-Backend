import { Entity, Enum, Property, ManyToOne, OneToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';
// import type { Solicitud } from '../solicitud/solicitud.entity.js';
// import type { EjercicioRutina } from '../ejercicio-rutina/ejercicio-rutina.entity.js';

export enum EstadoRutina {
  ACTIVA = 'activa',
  INACTIVA = 'inactiva',
}

@Entity()
export class Rutina extends BaseEntity {
  // id, fecha de creación y fecha de actualización se heredan de BaseEntity

  @Property({ type: 'string', length: 80, nullable: false })
  nombre!: string;

  // Regularidad: rutina simple con descripción en texto libre (todavía sin Ejercicio)
  @Property({ type: 'text', length: 255, nullable: false })
  descripcion!: string;

  @Enum(() => EstadoRutina)
  estado: EstadoRutina = EstadoRutina.ACTIVA;

  // Relación N:1: Muchas Rutinas pueden ser creadas por 1 solo Usuario (entrenador)
  @ManyToOne(() => 'Usuario', { nullable: false, fieldName: 'entrenador_id' })
  entrenador!: Usuario;

  // Relación 1:1: Rutina es el lado dueño. La FK solicitud_id vive en esta tabla y es UNIQUE.
  // @OneToOne(() => 'Solicitud', { owner: true, nullable: false, fieldName: 'solicitud_id' })
  // solicitud!: Solicitud;

  // Relación 1:N: Una Rutina puede tener muchos EjerciciosRutina asociados
  // @OneToMany(() => 'EjercicioRutina', 'rutina', { cascade: [Cascade.ALL], orphanRemoval: true })
  // ejerciciosRutina = new Collection<EjercicioRutina>(this);
}
