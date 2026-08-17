import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CmsService } from '../cms/cms.service';
import { CacheService } from '../cache/cache.service';
import { GROUPS } from './settings.definitions';
import type { FieldSpec, FieldValue, SettingsResponse } from './settings.types';

const SECRET_MASK = '**redacted**';
const CACHE_TTL = 60;
const CACHE_PREFIX = 'settings:group:';

function isValueRecord(v: unknown): v is Record<string, FieldValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function maskSecrets(
  fields: FieldSpec[],
  values: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = { ...values };
  for (const field of fields) {
    if (field.type === 'password') {
      const v = out[field.key];
      if (typeof v === 'string' && v !== '') {
        out[field.key] = SECRET_MASK;
      }
    }
  }
  return out;
}

function applyIncoming(
  fields: FieldSpec[],
  existing: Record<string, FieldValue>,
  incoming: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const merged: Record<string, FieldValue> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const field = fields.find((f) => f.key === key);
    if (field?.type === 'password' && value === SECRET_MASK) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function validateValues(
  group: string,
  fields: FieldSpec[],
  values: Record<string, FieldValue>,
): void {
  for (const field of fields) {
    const value = values[field.key];
    if (field.type === 'colour' && typeof value === 'string' && value !== '') {
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
        throw new BadRequestException(
          `${field.label} must be a valid 6-digit hex colour (e.g. #a1b2c3)`,
        );
      }
    }
  }
  if (group === 'commission') {
    const platform = values['platformRate'];
    const instructor = values['instructorRate'];
    if (typeof platform === 'number' && (platform < 0 || platform > 100)) {
      throw new BadRequestException('platformRate must be between 0 and 100');
    }
    if (typeof instructor === 'number' && (instructor < 0 || instructor > 100)) {
      throw new BadRequestException('instructorRate must be between 0 and 100');
    }
  }
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly cmsService: CmsService,
    private readonly cache: CacheService,
  ) {}

  async getGroup(group: string): Promise<SettingsResponse> {
    const definition = GROUPS[group];
    if (!definition) {
      throw new NotFoundException(`Unknown settings group: ${group}`);
    }

    const cacheKey = CACHE_PREFIX + group;
    const cached = await this.cache.get<Record<string, FieldValue>>(cacheKey);
    const stored = cached ?? await this.loadStored(group);

    const values = { ...definition.defaults, ...stored };
    const masked = maskSecrets(definition.fields, values);

    return {
      group,
      meta: definition.meta,
      fields: definition.fields,
      values: masked,
    };
  }

  async putGroup(
    group: string,
    incoming: Record<string, FieldValue>,
  ): Promise<SettingsResponse> {
    const definition = GROUPS[group];
    if (!definition) {
      throw new NotFoundException(`Unknown settings group: ${group}`);
    }

    validateValues(group, definition.fields, incoming);

    const stored = await this.loadStored(group);
    const existing: Record<string, FieldValue> = { ...definition.defaults, ...stored };

    const merged = applyIncoming(definition.fields, existing, incoming);

    await this.cmsService.upsertSiteSetting({
      key: `settings:${group}`,
      value: merged as Record<string, unknown>,
    });

    await this.cache.del(CACHE_PREFIX + group);

    return this.getGroup(group);
  }

  private async loadStored(group: string): Promise<Record<string, FieldValue>> {
    const raw: unknown = await this.cmsService.getSiteSetting(`settings:${group}`);
    if (!isValueRecord(raw)) return {};

    const validValue: Record<string, FieldValue> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean' ||
        v === null
      ) {
        validValue[k] = v;
      }
    }

    await this.cache.set(CACHE_PREFIX + group, validValue, CACHE_TTL);
    return validValue;
  }
}
