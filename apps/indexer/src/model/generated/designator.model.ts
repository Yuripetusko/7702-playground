import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Event} from "./event.model"

@Entity_()
export class Designator {
    constructor(props?: Partial<Designator>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    address!: string

    @OneToMany_(() => Account, e => e.designator)
    accounts!: Account[]

    @OneToMany_(() => Event, e => e.designator)
    events!: Event[]
}
