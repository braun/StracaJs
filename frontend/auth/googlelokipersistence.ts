import { GoogleAuth } from "./google";

export class GoogleDriveLokiPersistencecAdapter implements LokiPersistenceAdapter
{
    auth: GoogleAuth;
 //   mode?: string;
    constructor(auth:GoogleAuth)
    {
        this.auth = auth;
  //      this.mode 
    }
   
     loadDatabase(dbname: string, callback: (value: any) => void): void {
        const doLoad = async ()=>{
            try
            {
                const data = await this.auth.loadAppData(dbname);
                callback(data);
            }
            catch(ex)
            {
                console.error("loadDatabase",ex);
                callback(ex);
            }
        }

        doLoad();
    }
    deleteDatabase?(dbnameOrOptions: any, callback: (err?: Error, data?: any) => void): void {
        const doDelete= async ()=>{
            try
            {
                const data = await this.auth.deleteAppData(dbnameOrOptions);
                callback(null);
            }
            catch(ex)
            {
                console.error("deleteDatabase",ex);
                callback(null);
            }
        }
        doDelete();
    }
   
    saveDatabase?(dbname: string, dbstring: any, callback: (err?: Error) => void): void {
        const doSave = async ()=>{
            try
            {
                const data = await this.auth.saveAppData(dbstring,dbname);
                callback(null);
            }
            catch(ex)
            {
                console.error("saveDatabase",ex);
                callback(ex);
            }
        }
        doSave();
    }

}

