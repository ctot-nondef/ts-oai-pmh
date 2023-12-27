export interface IOAIHarvesterOptionsInterface extends Record<string, any> {
    userAgent: string;
    retry: Boolean;
    retryMin: number;
    retryMax: number;
}
