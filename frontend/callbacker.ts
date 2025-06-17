/**
 * generic listener executor
 * it holds list of callback and performs specified operation on them (fires them)
 */
export class Callbacker<T>
{

    protected listeners:T[] = [];

    /**
     * Adds listener to list
     * @param listener listener to add
     * @returns function to remove the listener
     */
    addListener(listener:T)
    {
        if(this.listeners.indexOf(listener) == -1)
            this.listeners.push(listener);

        return ()=> {
           const idx = this.listeners.indexOf(listener);
           if(idx != -1)
           {
               this.listeners.splice(idx,1);
           }
        }
    }

    /**
     * fires the listeners by performing specified operation on them
     * @param oper operation to be performed on listener
     */
    fire(oper:(t:T)=>void)
    {
        for(const listener of this.listeners)
        {
            try
            {
                oper(listener);
            }
            catch(err)
            {
                console.error("Callbacker",err)
            }
        }
    }
    
}