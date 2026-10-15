
import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';

export enum EstadoSolicitud {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
}

@Entity()
export class Solicitud extends BaseEntity {
  @Property({ type: 'date', nullable: false })
  fechaSolicitud!: string;

  @Property({ nullable: false })
  peso!: number;

  @Property({ nullable: false })
  masaMuscular!: number;

  @Property({ nullable: false })
  altura!: number;

  @Property({ nullable: false })
  objetivo!: string;

  @Property({ nullable: true })
  lesionesPrevias?: string;

  @Enum(() => EstadoSolicitud)
  estado: EstadoSolicitud = EstadoSolicitud.PENDIENTE;

  @ManyToOne(() => Usuario, { nullable: false })
  cliente!: Usuario;
}
