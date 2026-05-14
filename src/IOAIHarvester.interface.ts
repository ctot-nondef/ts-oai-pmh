import type { IOAIListRequestParamsInterface } from "./IOAIRequestParams.interface.js";

/**
 * @interface
 */
export interface IOAIHarvesterInterface {
  baseUrl: URL;
  options: IOAIHarvesterOptionsInterface;
}

export interface IOAIRetryOptionsInterface {
  enabled: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  maxRetries: number;
}

/**
 * @interface
 */
export interface IOAIHarvesterOptionsInterface {
  baseUrl: string | URL;
  userAgent: string;
  retry: IOAIRetryOptionsInterface;
  requestMethod: "GET" | "POST";
  fetch: typeof fetch;
  signal?: AbortSignal;
}

export interface IOAIHarvesterConstructorOptionsInterface {
  baseUrl: string | URL;
  userAgent?: string;
  retry?: boolean | Partial<IOAIRetryOptionsInterface>;
  requestMethod?: "GET" | "POST";
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export type TOAIListOptions = IOAIListRequestParamsInterface;
