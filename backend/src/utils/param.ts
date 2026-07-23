/**
 * Express 5 types req.params values as string | string[].
 * Use this helper to safely extract a single string param.
 */
export function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
