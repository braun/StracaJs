import { Message } from "../common/models/message";
import { MessageLoadResult } from "../common/models/mstore";
import { Callbacker } from "./callbacker";
import { StracaInHandful } from "./handful";



/**
 * options for StracaManager constructor
 */
export interface StracaStateOptions
{
    /**
     * message type callback for message holding the state
     */
    mtype?:(man:StracaStateManager<any>)=>string,

    /**
     * name of event to actualize the state.
     * set this to use backflow events to actualize state
     */
    actualizationEvent?:string
}

export interface StateChangedCallback<T>
{
    onStateChanged(state:T):void;
}
/**
 * wrapper around cli.state msg
 * Manages client state by saving and loading it into message store
 */
export class StracaStateManager<T>
{
    protected straca:StracaInHandful;
    protected stateMsg:Message;
    protected options:StracaStateOptions = {
        mtype: ()=>`cli.state.its.${app.straca.appToken}`
    };
    
    constructor(straca:StracaInHandful,options?:StracaStateOptions)
    {
        this.straca = straca;
        if(options != null)
            this.options = Object.assign(this.options,options);
    
       
    }

    onchange: Callbacker<(state:T)=>void> = new Callbacker();

     /**
     * Message type for client's state
     */
     get stateMt():string
     {
         return this.options.mtype(this);
     }
 
     /**
      * current client state (content of cli.state msg)
      * @returns current client State
      */
     get state():T
     {
        return this.stateMsg?.content;
     }

     /**
      * loads the state if not loaded
      * @returns this
      */
     async get()
     {
        if(this.stateMsg == null)
            await this.loadState();
        return this;
     }
     /**
      * loads client state from message store
      * @returns current client state
      */
     async loadState()
     {
        const res = await this.straca.loadMessages().mtype(this.stateMt).loadOne();
        if(res != null)
        {
            this.stateMsg = res;
            this.onchange.fire((cb)=>cb(this.state));
 
        }
        return this;
     }

     async listenState()
     {
        if(!this.options.actualizationEvent)
            this.options.actualizationEvent = this.stateMt;
        (await this.straca.caw.subscribe(this.options.actualizationEvent)).onCaw((ev)=>{
            const msgs = ev.data as MessageLoadResult;
            if(msgs.data != null && msgs.data.length > 0)
            {
                this.stateMsg = msgs.data[0];
                this.onchange.fire((cb)=>cb(this.state));
            }
        })
     }

  
     /**
      * saves current client state to mesage store
      */
     async saveState()
     {
        await this.straca.messageStore.save({
            meta:{
                messageType:this.stateMt
            },
            content: this.state
        });
     }
}