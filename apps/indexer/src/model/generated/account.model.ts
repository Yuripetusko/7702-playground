import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Designator} from "./designator.model"
import {Event} from "./event.model"

@Entity_()
export class Account {
    constructor(props?: Partial<Account>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Designator, {nullable: true})
    designator!: Designator | undefined | null

    @OneToMany_(() => Event, e => e.account)
    events!: Event[]
}
