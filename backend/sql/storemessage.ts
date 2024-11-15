import { Entity,Column, PrimaryColumn,Index,CreateDateColumn } from "typeorm";

@Entity()
export class StoredMessage {
       

     /**
      * unique id of message
      */

     @PrimaryColumn()
     messageUid:string;

     /**
      * type of message. It determines the type of content in the fact.
      * And message store sets default behavior of messages with specific message type prefix
      */
       @Column('varchar',{length:128})
     @Index()
     messageType:string;

     

     /**
      * Time of creation
      */
     @CreateDateColumn()
     created?:string;

      /**
      * The user that created the message
      */
      @Column('varchar',{length:32})
      @Index()
      creator?:string;

     @Column('varchar',{length:64})
     @Index()
     device:string;

     /**
      * Time of expiration
      */
     @Column('datetime',{nullable:true})
     expires?:string;

     @Column('text')
     meta:string;

     @Column('text')
     content:string;

    
}