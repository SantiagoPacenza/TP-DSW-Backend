import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { Membresia } from '../membresia/membresia.entity.js';

@Entity()
export class Pago {

  // Clave parcial: se identifica junto con la membresía.
  @Property({ primary: true, type: 'integer' })
  idPago!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  monto!: string;

  @Property()
  metodoPago!: string;

  @Property({ type: 'date' })
  fechaLimitePago!: string;

  @Property({ type: 'date', nullable: true })
  fechaPago?: string | null;

  // Cada pago pertenece obligatoriamente a una membresía.
  // La membresía forma parte de la clave primaria compuesta.
  // Una membresía puede tener muchos pagos, pero cada pago pertenece a una sola membresía. 
  @ManyToOne(() => Membresia, { primary: true, nullable: false, })
  membresia!: Membresia;
}

//sssssssssssssssssssssssss