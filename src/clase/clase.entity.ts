import { Entity, Enum, Property, OneToMany, ManyToOne, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Inscripcion } from '../inscripcion/inscripcion.entity.js';
import type { Disciplina } from '../disciplina/disciplina.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';

export enum DiaSemana {
  LUNES = 'lunes',
  MARTES = 'martes',
  MIERCOLES = 'miercoles',
  JUEVES = 'jueves',
  VIERNES = 'viernes',
  SABADO = 'sabado',
  DOMINGO = 'domingo'
}

@Entity()
export class Clase extends BaseEntity {

  @Property({ type: 'int', nullable: false})
  cupos!: number;

  @Enum(() => DiaSemana)
  diaSemana!: DiaSemana;

  @Property({ type: 'string', length: 10, nullable: false })
  horaInicio!: string;                                          // Manejado como string plano 'HH:mm': evita errores

  @Property({ type: 'string', length: 10, nullable: false })
  horaFin!: string;                                             // Manejado como string plano 'HH:mm': evita errores

  // Relación: 1 Clase puede tener N Inscripciones
  @OneToMany(() => 'Inscripcion', (inscripcion: Inscripcion) => inscripcion.clase)
  inscripciones = new Collection<Inscripcion>(this);

  // Relación: Muchas Clases pertenecen a 1 sola Disciplina (obligatorio)
  @ManyToOne(() => 'Disciplina', { nullable: false })
  disciplina!: Disciplina;

  // Relación: Muchas Clases pertenecen a 1 solo Usuario de rol Entrenador (obligatorio)
  @ManyToOne(() => 'Usuario', { nullable: false })
  usuario!: Usuario;
  
}
