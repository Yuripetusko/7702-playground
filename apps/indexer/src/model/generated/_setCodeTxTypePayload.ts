import assert from "assert"
import * as marshal from "./marshal"

export class SetCodeTxTypePayload {
    public readonly isTypeOf = 'SetCodeTxTypePayload'
    private _from!: string
    private _designatorAddress!: string | undefined | null

    constructor(props?: Partial<Omit<SetCodeTxTypePayload, 'toJSON'>>, json?: any) {
        Object.assign(this, props)
        if (json != null) {
            this._from = marshal.string.fromJSON(json.from)
            this._designatorAddress = json.designatorAddress == null ? undefined : marshal.string.fromJSON(json.designatorAddress)
        }
    }

    get from(): string {
        assert(this._from != null, 'uninitialized access')
        return this._from
    }

    set from(value: string) {
        this._from = value
    }

    get designatorAddress(): string | undefined | null {
        return this._designatorAddress
    }

    set designatorAddress(value: string | undefined | null) {
        this._designatorAddress = value
    }

    toJSON(): object {
        return {
            isTypeOf: this.isTypeOf,
            from: this.from,
            designatorAddress: this.designatorAddress,
        }
    }
}
