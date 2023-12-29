import {IOAIHarvesterOptionsInterface} from "./IOAIHarvesterOptions.interface";

export interface IOAIHarvesterInterface extends Record<string, any> {
    baseUrl: URL;
    options: IOAIHarvesterOptionsInterface;
}
