import { Message } from "../common/models/message";
import { HeaderDevice } from "../common/constants";
import {MessageStore} from "../common/models/mstore";
import { SqliteStore } from "./sqlite/sqlitestore";
import { Straca } from "./straca";
import { join } from "path";

const TAG="STRACATORE";
export class StracaStore
{
    messageStore: MessageStore;

    straca:Straca;

    constructor(straca:Straca,urlpath:string)
    {
        this.straca = straca;
        this.messageStore = new SqliteStore(join(process.cwd(),"..","data","db.sqlite"));
        straca.app.use(urlpath,async (req,res,next)=>{
            try
            {
                const opname = req.headers["X-straca-op"];
                const httpmethod = req.method;
                const body = req.body as any;
                const appid = req.headers[HeaderDevice]
                console.log(TAG,"CALL:",opname,httpmethod,appid)
                if(httpmethod == "PUT")
                {
                    const msg = body as Message;
                    console.log(TAG,"SAVE MESSAGE", msg.meta.messageType, msg.meta.messageUid);
                    await this.messageStore.save(msg);
                    res.status(200);
                    res.send("OK");
                    return;
                }
                else if(httpmethod == "POST")
                {
                    const msg = body as Message;
                    const rv = await this.messageStore.loadByExample(msg);
                    res.type('json');
                    res.status(200);
                    res.send(JSON.stringify(rv,null,2));
                    return;
                }
            }
            catch(err)
            {
                console.error(TAG,err);
                res.status(500);
                res.send(err);
            }
        })
    }
}