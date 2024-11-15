import {SetCodeTxTypePayload} from "./_setCodeTxTypePayload"

export type EventPayloads = SetCodeTxTypePayload

export function fromJsonEventPayloads(json: any): EventPayloads {
    switch(json?.isTypeOf) {
        case 'SetCodeTxTypePayload': return new SetCodeTxTypePayload(undefined, json)
        default: throw new TypeError('Unknown json object passed as EventPayloads')
    }
}
