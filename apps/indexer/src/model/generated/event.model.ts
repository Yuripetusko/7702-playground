import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import * as marshal from "./marshal"
import {Block} from "./block.model"
import {EventType} from "./_eventType"
import {EventPayloads, fromJsonEventPayloads} from "./_eventPayloads"
import {Designator} from "./designator.model"
import {Account} from "./account.model"

@Entity_()
export class Event {
    constructor(props?: Partial<Event>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Block, {nullable: true})
    block!: Block

    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @Column_("varchar", {length: 13, nullable: true})
    eventType!: EventType | undefined | null

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : fromJsonEventPayloads(obj)}, nullable: false})
    payload!: EventPayloads

    @StringColumn_({nullable: true})
    from!: string | undefined | null

    @Index_()
    @ManyToOne_(() => Designator, {nullable: true})
    designator!: Designator | undefined | null

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    account!: Account | undefined | null
}
