import { Entity, Enum, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';
import type { Plan } from '../plan/plan.entity.js';

export enum EstadoMembresia {
  ACTIVA = 'activa',
  INACTIVA = 'inactiva',
  CANCELADA = 'cancelada'
}

@Entity()
export class Membresia extends BaseEntity {
  
  // fechaInicio y fechaRegistro manejado como string plano 'YYYY-MM-DD': evita problemas de zona horaria.

  @Property({ type: 'date', nullable: true })
  fechaInicio?: string;

  @Property({ type: 'date', nullable: true })
  fechaFin?: string;

  @Enum(() => EstadoMembresia)
  estadoMembresia!: EstadoMembresia;

  // Relación: Muchas membresías pertenecen a 1 solo Usuario (obligatorio)
  @ManyToOne(() => 'Usuario', { nullable: false })
  usuario!: Usuario;

  // Relación: Muchas membresías pertenecen a 1 solo Plan (obligatorio)
  @ManyToOne(() => 'Plan', { nullable: false })
  plan!: Plan;

}