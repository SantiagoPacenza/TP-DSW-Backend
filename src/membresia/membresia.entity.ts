import { Entity, Enum, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';
import type { Plan } from '../plan/plan.entity.js';

export enum EstadoMembresia {
  PENDIENTE = 'pendiente',
  ACTIVA = 'activa',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
}

@Entity()
export class Membresia extends BaseEntity {
  // Fechas generadas por el servidor a partir de la duración del plan.

  @Property({ type: 'date', nullable: false })
  fechaInicio!: string;

  @Property({ type: 'date', nullable: false })
  fechaFin!: string;

  @Enum(() => EstadoMembresia)
  estadoMembresia: EstadoMembresia = EstadoMembresia.PENDIENTE;

  // Relación: Muchas membresías pertenecen a 1 solo Cliente (obligatorio)
  @ManyToOne(() => 'Usuario', { nullable: false })
  cliente!: Usuario;

  // Relación: Muchas membresías pertenecen a 1 solo Plan (obligatorio)
  @ManyToOne(() => 'Plan', { nullable: false })
  plan!: Plan;
}
