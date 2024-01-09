export interface IOAIHarvesterOptionsInterface extends Record<string, any> {
	userAgent: string;
	retry: boolean;
	retryMin: number;
	retryMax: number;
}
