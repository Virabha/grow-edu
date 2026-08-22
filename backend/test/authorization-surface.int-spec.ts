import { INestApplication } from '@nestjs/common';
import { MetadataScanner, ModulesContainer, Reflector } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { createTestDatabase, TestDatabase } from './support/test-database';
import { createTestApp } from './support/test-app';
import { AUTHORIZATION_KEYS } from '../src/auth/authorization';

type Route = { signature: string; stances: string[] };

function join(controllerPath: string, handlerPath: string): string {
  const parts = [controllerPath, handlerPath]
    .filter((p) => p && p !== '/')
    .join('/');
  return `/${parts}`.replace(/\/+/g, '/');
}

describe('authorization surface', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let routes: Route[];

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);

    const modules = app.get(ModulesContainer);
    const reflector = app.get(Reflector);
    const scanner = new MetadataScanner();

    const controllers = [...modules.values()].flatMap((m) => [
      ...m.controllers.values(),
    ]);

    routes = [];
    for (const wrapper of controllers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const controllerPath: string =
        Reflect.getMetadata(PATH_METADATA, metatype) ?? '';
      const prototype = Object.getPrototypeOf(instance);

      for (const name of scanner.getAllMethodNames(prototype)) {
        const handler = prototype[name];
        const verb = Reflect.getMetadata(METHOD_METADATA, handler);
        if (verb === undefined) continue;

        const handlerPath: string =
          Reflect.getMetadata(PATH_METADATA, handler) ?? '';
        const stances = AUTHORIZATION_KEYS.filter(
          (key) =>
            reflector.getAllAndOverride(key, [handler, metatype]) !== undefined,
        );

        routes.push({
          signature: `${RequestMethod[verb]} ${join(controllerPath, handlerPath)} (${metatype.name}.${name})`,
          stances: [...stances],
        });
      }
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  it('finds the routes it is meant to be auditing', () => {
    expect(routes.length).toBeGreaterThan(200);
  });

  it('leaves no endpoint without a declared authorization stance', () => {
    const undeclared = routes
      .filter((r) => r.stances.length === 0)
      .map((r) => r.signature)
      .sort();

    expect(undeclared).toEqual([]);
  });
});
