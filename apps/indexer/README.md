# EIP-7702 Account delegate indexer

## Local dev

If you updated abi and need to generate new types
`npx squid-evm-typegen src/abi abi/SkyBreachABI.json`

Open docker app

Kill previous docker container if present
`docker compose down`
`pnpm build`
`docker compose up -d`
`npx squid-typeorm-migration apply`
`node -r dotenv/config lib/main.js`

Start local graphql server. In new terminal tab run:
`npx squid-graphql-server`

If you edited `schema.graphql` then generate new db migration

Generate models from schema
`npx squid-typeorm-codegen`

Start docker if you haven't already
`docker compose up -d`

Apply existing migrations first
`npx squid-typeorm-migration apply`

Generate new migration
`npx squid-typeorm-migration generate`

Apply new migration
`npx squid-typeorm-migration apply`

## Deploy an update without reindexing

### Staging

`sqd deploy --org {yourSqdOrg} . --manifest=squid-staging.yaml`

## Prod

`sqd deploy --org {yourSqdOrg} . --manifest=squid-prod.yaml`

## Deploy and drop db (reindex)

`sqd deploy --org {yourSqdOrg} . --manifest=squid-prod.yaml --hard-reset`

## Zero downtime deploy

Edit corresponding yaml file (staging or prod) to temporary remove `tag` field.

Deploy to one of the hibernated squid slots. i.e. if `stage2` is currently the one running, and `stage` is hibernating
then run
`sqd deploy . -s stage --manifest=squid-staging.yaml`

Once sqd is indexed and you confirmed that it is correct, switch the tag `staging` to point to slot `stage`
`sqd tags add staging -n skybreach-lands -s stage`

Add back `tag` to yaml file

If client is using direct db access, don't forget to update env vars to point to new db image
