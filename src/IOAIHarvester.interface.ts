import type { IOAIHarvesterOptionsInterface } from "./IOAIHarvesterOptions.interface";

/**
 * @interface
 */
export interface IOAIHarvesterInterface extends Record<string, any> {
	baseUrl: URL;
	options: IOAIHarvesterOptionsInterface;
}
