
import * as express from 'express';
import { StracaStore } from './stracastore';

export class Straca
{
    app:express.Express
    stracastore:StracaStore;
    constructor(app:express.Express)
    {
        this.app = app;
        this.stracastore = new StracaStore(this,"/stracastore");
    }
}