import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';
import { disciplinaRouter } from './disciplina/disciplina.routes.js';
import { usuarioRouter } from './usuario/usuario.routes.js';
import { planRouter } from './plan/plan.routes.js';
import { membresiaRouter } from './membresia/membresia.routes.js';
import { claseRouter } from './clase/clase.routes.js';
import { inscripcionRouter } from './inscripcion/inscripcion.routes.js';
import { solicitudRouter } from './solicitud/solicitud.routes.js';
import { rutinaRouter } from './rutina/rutina.routes.js';
import { categoriaRouter } from './categoria/categoria.routes.js';
import { ejercicioRouter } from './ejercicio/ejercicio.routes.js';
import { ejercicioRutinaRouter } from './ejercicioRutina/ejercicioRutina.routes.js';
import { pagoRouter } from './pago/pago.routes.js';
import { authRouter } from './auth/auth.routes.js';
import { erroresRouter } from './errors/error.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Debe ir después de los middlewares base
app.use((_req, _res, next) => {
  RequestContext.create(orm.em, next);
});
// y antes de las rutas y middlewares de negocio

app.use('/api/usuarios', usuarioRouter);
app.use('/api/disciplinas', disciplinaRouter);
app.use('/api/planes', planRouter);
app.use('/api/membresias', membresiaRouter);
app.use('/api/clases', claseRouter);
app.use('/api/inscripciones', inscripcionRouter);
app.use('/api/solicitudes', solicitudRouter);
app.use('/api/rutinas', rutinaRouter);
app.use('/api/categorias', categoriaRouter);
app.use('/api/ejercicios', ejercicioRouter);
app.use('/api/ejerciciosRutina', ejercicioRutinaRouter);
app.use('/api/pagos', pagoRouter);
app.use('/api/', authRouter);
app.use('/api/errores', erroresRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

await syncSchema(); // solo en desarrollo

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
