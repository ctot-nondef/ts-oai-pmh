/**
 * @interface
 */
export interface IOAIHarvesterInterface {
	baseUrl: URL;
	options: IOAIHarvesterOptionsInterface;
}

/**
 * @interface
 */
export interface IOAIHarvesterOptionsInterface {
	userAgent: string;
	retry: boolean;
	retryMin: number;
	retryMax: number;
}
