export interface  IAuthPayload<T = any>
{
    provider:string;
    providerData:T;
}

export interface IAuthResponse
{
    sessionToken:string;
    userId:string;
    provider:string;
  
}
export interface IProviderResult
{
    isValid:boolean;
    message?:string;
    userId:string;
    provider:string;
    providerData?:any;
}