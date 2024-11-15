import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, DateTimeColumn as DateTimeColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Event} from "./event.model"

@Entity_()
export class Block {
    constructor(props?: Partial<Block>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @IntColumn_({nullable: false})
    number!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @OneToMany_(() => Event, e => e.block)
    events!: Event[]
}
