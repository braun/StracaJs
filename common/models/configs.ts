/**
 * request to get config json by name
 */
export interface IStracaConfigRequest
{
    /** name of the config */
    name:string;
}

/**
 * response with config json
 */
export interface IStracaConfigResponse<T=any>
{
    /** name of the config */
    name:string;

    /** config json */
    config:T;
}

