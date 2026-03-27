import type { AccessStatus, DataScope, DepartmentLevel, MenuItemType, UserType } from '../types';
import { badRequest } from './errors';

export function asObject(value: unknown, fieldName = 'body'): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    badRequest(`${fieldName} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

export function getString(
  input: Record<string, unknown>,
  field: string,
  options: { required?: boolean; allowEmpty?: boolean } = {},
): string | undefined {
  const value = input[field];
  if (value == null) {
    if (options.required) badRequest(`缺少字段：${field}`);
    return undefined;
  }
  if (typeof value !== 'string') {
    badRequest(`字段 ${field} 必须是字符串`);
  }
  const trimmed = value.trim();
  if (!options.allowEmpty && !trimmed) {
    badRequest(`字段 ${field} 不能为空`);
  }
  return trimmed;
}

export function getBoolean(
  input: Record<string, unknown>,
  field: string,
  options: { required?: boolean } = {},
): boolean | undefined {
  const value = input[field];
  if (value == null) {
    if (options.required) badRequest(`缺少字段：${field}`);
    return undefined;
  }
  if (typeof value !== 'boolean') {
    badRequest(`字段 ${field} 必须是布尔值`);
  }
  return value;
}

export function getNumber(
  input: Record<string, unknown>,
  field: string,
  options: { required?: boolean; min?: number } = {},
): number | undefined {
  const value = input[field];
  if (value == null) {
    if (options.required) badRequest(`缺少字段：${field}`);
    return undefined;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    badRequest(`字段 ${field} 必须是数字`);
  }
  if (options.min != null && value < options.min) {
    badRequest(`字段 ${field} 不能小于 ${options.min}`);
  }
  return value;
}

export function getStringArray(
  input: Record<string, unknown>,
  field: string,
  options: { required?: boolean } = {},
): string[] | undefined {
  const value = input[field];
  if (value == null) {
    if (options.required) badRequest(`缺少字段：${field}`);
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    badRequest(`字段 ${field} 必须是字符串数组`);
  }
  return value;
}

function getEnumValue<T extends string>(
  input: Record<string, unknown>,
  field: string,
  values: readonly T[],
  options: { required?: boolean } = {},
): T | undefined {
  const value = input[field];
  if (value == null) {
    if (options.required) badRequest(`缺少字段：${field}`);
    return undefined;
  }
  if (typeof value !== 'string' || !values.includes(value as T)) {
    badRequest(`字段 ${field} 必须是以下值之一：${values.join(', ')}`);
  }
  return value as T;
}

export function getUserType(input: Record<string, unknown>, field = 'userType', required = true): UserType | undefined {
  return getEnumValue(input, field, ['staff', 'student'], { required });
}

export function getAccessStatus(
  input: Record<string, unknown>,
  field = 'accessStatus',
  required = false,
): AccessStatus | undefined {
  return getEnumValue(input, field, ['full', 'partial', 'inactive'], { required });
}

export function getDataScope(
  input: Record<string, unknown>,
  field = 'dataScope',
  required = false,
): DataScope | undefined {
  return getEnumValue(input, field, ['school', 'college', 'major', 'class'], { required });
}

export function getDepartmentLevel(
  input: Record<string, unknown>,
  field = 'level',
  required = false,
): DepartmentLevel | undefined {
  return getEnumValue(input, field, ['university', 'college', 'stage', 'major', 'class'], { required });
}

export function getMenuType(input: Record<string, unknown>, field = 'type', required = false): MenuItemType | undefined {
  return getEnumValue(input, field, ['menu', 'button'], { required });
}
