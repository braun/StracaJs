

/**
 * Message in Message Store
 */
export interface Message
{
    /**
     * The meta data
     */
    meta: {
        /**
         * id of device the message has been created on
         */
        device?:string;

        /**
         * The user that created the message
         */
        creator?:string;

        /**
         * unique id of message
         */
        messageUid?:string;

        /**
         * type of message. It determines the type of content in the fact.
         * And message store sets default behavior of messages with specific message type prefix
         */
        messageType:string;

        /**
         * Time of expiration
         */
        expires?:string;

        /**
         * Time of creation
         */
        created?:string;
    },

    /**
     * The data of the message
     */
    content:any
}