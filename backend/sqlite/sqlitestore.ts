​import { Database } from 'sqlite3';
import { MessageListenerContext, MessageStore } from '../../common/models/mstore';
import { Message } from '../../common/models/message';
import * as dayjs from 'dayjs';


const TAG="SQLITESTORE";

export class SqliteStore implements MessageStore
{
    protected _db:Database;
    constructor(dbpath:string)
    {
    // Open a SQLite database, stored in the file db.sqlite
        this._db = new Database(dbpath);

        this._db.exec(
        `CREATE TABLE IF NOT EXISTS Message (
            messageUid VARCHAR(36) not null unique,
            messageType VARCHAR(255) not null,
            created VARCHAR(36) not null,
            expires VARCHAR(36),
            device VARCHAR(36),
            creator VARCHAR(36),    
            meta TEXT NOT NULL,
            content TEXT NOT NULL,
            saved VARCHAR(36) not null
        );

        CREATE INDEX IF NOT EXISTS IDX_MessageType ON Message (messageType);
        CREATE UNIQUE INDEX IF NOT EXISTS IDX_MessageUid ON Message (messageUid);
        CREATE INDEX IF NOT EXISTS IDX_Device ON Message (device);
        CREATE INDEX IF NOT EXISTS IDX_Creator ON Message (creator);`)

    }

    save(msg: Message): Promise<boolean> {
        const rv = new Promise<boolean>((resolve,reject)=>{
            const m = msg.meta;
            this._db.run(`insert into Message 
                (messageUid,messageType,created,expires,device,creator,meta,content,saved)
                values (?,?,?,?,?,?,?,?,?)`,
                [m.messageUid,m.messageType,m.created,m.expires,m.device,m.creator,
                    JSON.stringify(m),JSON.stringify(msg.content),dayjs().toISOString()],(err)=>{
                    if(err != null)
                    {
                        console.log(TAG,"save failed",msg.meta.messageUid,msg.meta.messageType,err);
                        reject(err);
                    }
                    else
                        resolve(true);
                });
        });
        return rv;
       
    }
    loadByExample(example: Message): Promise<Message[]> {
        const promise = new Promise<Message[]>((resolve,reject)=>{
            var qpars = "";
            const addPar  = (parname:string, value:any,like:boolean)=>{
                if(value == null)
                    return;
                if(qpars.length > 0)
                    qpars += " and "

                qpars += `${parname} ${like ? 'like': '='} '${value}${like ? '%':''}'`;
            }

            const m = example.meta;
            addPar("messageUid",m.messageUid,false);
            addPar("messageType",m.messageType,true);
            

            const sql = `select meta,content from Message where ${qpars}`;
            this._db.all<any>(sql,(err,rows)=>{
                if(err != null)
                {
                    reject(err);
                    return;
                }
                const rv:Message[] = [];
                for(const row of rows)
                {
                    const msg:Message = { meta : JSON.parse(row.meta), content: JSON.parse(row.content)};
                    rv.push(msg);
                }
                resolve(rv);
            })
        });
        return promise;
    }
    listen(mtype: string, callback: (m: Message) => void): MessageListenerContext {
        throw new Error('Method not implemented.');
    }
    
}
