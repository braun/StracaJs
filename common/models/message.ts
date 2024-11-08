export interface Message
{
    meta: {
        device?:string;
        creator?:string;
        messageUid?:string;
        messageType:string;
        expires?:string;
        created?:string;
    },
    content:any
}