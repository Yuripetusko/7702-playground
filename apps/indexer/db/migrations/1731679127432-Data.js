module.exports = class Data1731679127432 {
    name = 'Data1731679127432'

    async up(db) {
        await db.query(`ALTER TABLE "account" ADD "address" text NOT NULL`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "account" DROP COLUMN "address"`)
    }
}
