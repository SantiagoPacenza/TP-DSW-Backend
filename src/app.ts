import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';
import { disciplinaRouter } from './disciplina/disciplina.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Debe ir después de los middlewares base
app.use((_req, _res, next) => {
  RequestContext.create(orm.em, next);
});
// y antes de las rutas y middlewares de negocio

app.use('/api/disciplinas', disciplinaRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

await syncSchema(); // solo en desarrollo

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

