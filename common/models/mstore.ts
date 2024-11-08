
import { Message } from "./message";

export interface MessageListenerContext
{
    removeListener():void;
}
export interface MessageStore
{
    save(msg:Message):Promise<boolean>;

    loadByExample(exaple:Message):Promise<Message[]>;
    listen(mtype:string,callback:(m:Message)=>void):MessageListenerContext;
}


