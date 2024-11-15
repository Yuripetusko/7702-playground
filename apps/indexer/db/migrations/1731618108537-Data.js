module.exports = class Data1731618108537 {
    name = 'Data1731618108537'

    async up(db) {
        await db.query(`CREATE TABLE "block" ("id" character varying NOT NULL, "number" integer NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_d0925763efb591c2e2ffb267572" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_38414873c187a3e0c7943bc4c7" ON "block" ("number") `)
        await db.query(`CREATE TABLE "event" ("id" character varying NOT NULL, "transaction_hash" text NOT NULL, "event_type" character varying(13), "payload" jsonb NOT NULL, "from" text, "block_id" character varying, "designator_id" character varying, "account_id" character varying, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_2b0d35d675c4f99751855c4502" ON "event" ("block_id") `)
        await db.query(`CREATE INDEX "IDX_52424851e79072c2d785492da7" ON "event" ("event_type") `)
        await db.query(`CREATE INDEX "IDX_4713b4bb689f6765162b2db443" ON "event" ("designator_id") `)
        await db.query(`CREATE INDEX "IDX_77b76886d64fa0304db94dd4d9" ON "event" ("account_id") `)
        await db.query(`CREATE TABLE "designator" ("id" character varying NOT NULL, "address" text NOT NULL, CONSTRAINT "PK_02290a5e97af1fb6a4b8ff2dfa2" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "account" ("id" character varying NOT NULL, "designator_id" character varying, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_f9d72425de42a7c8d7df3f59e0" ON "account" ("designator_id") `)
        await db.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_2b0d35d675c4f99751855c45021" FOREIGN KEY ("block_id") REFERENCES "block"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_4713b4bb689f6765162b2db443d" FOREIGN KEY ("designator_id") REFERENCES "designator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_77b76886d64fa0304db94dd4d95" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_f9d72425de42a7c8d7df3f59e0e" FOREIGN KEY ("designator_id") REFERENCES "designator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`DROP TABLE "block"`)
        await db.query(`DROP INDEX "public"."IDX_38414873c187a3e0c7943bc4c7"`)
        await db.query(`DROP TABLE "event"`)
        await db.query(`DROP INDEX "public"."IDX_2b0d35d675c4f99751855c4502"`)
        await db.query(`DROP INDEX "public"."IDX_52424851e79072c2d785492da7"`)
        await db.query(`DROP INDEX "public"."IDX_4713b4bb689f6765162b2db443"`)
        await db.query(`DROP INDEX "public"."IDX_77b76886d64fa0304db94dd4d9"`)
        await db.query(`DROP TABLE "designator"`)
        await db.query(`DROP TABLE "account"`)
        await db.query(`DROP INDEX "public"."IDX_f9d72425de42a7c8d7df3f59e0"`)
        await db.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_2b0d35d675c4f99751855c45021"`)
        await db.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_4713b4bb689f6765162b2db443d"`)
        await db.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_77b76886d64fa0304db94dd4d95"`)
        await db.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_f9d72425de42a7c8d7df3f59e0e"`)
    }
}
