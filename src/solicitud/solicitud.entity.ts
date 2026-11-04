
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

  @Property({ type: 'double', nullable: false })
  peso!: number;

  @Property({ type: 'double', nullable: false })
  masaMuscular!: number;

  @Property({ type: 'double', nullable: false })
  altura!: number;

  @Property({ length: 200, nullable: false })
  objetivo!: string;

  @Property({ type: 'string', length: 500, nullable: true })
  lesionesPrevias?: string | null;

  @Enum(() => EstadoSolicitud)
  estado: EstadoSolicitud = EstadoSolicitud.PENDIENTE;

  @ManyToOne(() => Usuario, { nullable: false })
  cliente!: Usuario;
}
