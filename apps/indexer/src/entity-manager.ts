import { EntityClass, FindOneOptions, Store } from '@subsquid/typeorm-store';
import type { FindOptionsRelations, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';

export const splitIntoBatches = <T>(array: T[], maxBatchSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += maxBatchSize) {
    const chunk = array.slice(i, i + maxBatchSize);
    result.push(chunk);
  }
  return result;
};

// @ts-ignore
abstract class StoreWithEntityManager extends Store {
  // @ts-ignore
  public em: () => EntityManager;
}
export type DbStore = StoreWithEntityManager;

type ID = string;

interface EntityWithId {
  id: ID;
}

export class EntitiesManager<Entity extends EntityWithId> {
  store: DbStore;

  entity: EntityClass<Entity>;

  entitiesMap: Map<string, Entity> = new Map();

  prefetchItemIdsList: string[] = [];

  constructor(entity: EntityClass<Entity>, store: DbStore) {
    this.entity = entity;
    this.store = store;
  }

  add(entity: Entity): void {
    this.entitiesMap.set(entity.id, entity);
  }

  /**
   * Get entity by ID either from local cache or DB, if it's not existing in
   * local cache ("entitiesMap").
   *
   * @param id: string
   * @param relations?: FindOptionsRelations<Entity>
   */
  async get(id: ID, relations?: FindOptionsRelations<Entity>): Promise<Entity | null> {
    if (!this.store) {
      throw new Error('context is not defined');
    }
    let item = this.entitiesMap.get(id) || null;

    if (!item) {
      const requestParams = {
        where: { id },
      } as FindOneOptions<Entity>;

      if (relations) {
        requestParams.relations = relations;
      }

      item = (await this.store.findOne(this.entity, requestParams)) || null;

      if (item) {
        this.add(item);
      }
    }

    return item;
  }

  async getOrThrow(id: ID, relations?: FindOptionsRelations<Entity>): Promise<Entity> {
    const entity = await this.get(id, relations);

    if (!entity) {
      throw new Error(`Entity: ${this.entity.name} with id ${id} expected to exist`);
    }

    return entity;
  }

  async getOrCreate(
    id: ID,
    creator: () => Promise<Entity>,
    relations?: FindOptionsRelations<Entity>,
  ): Promise<Entity> {
    if (!this.store) throw new Error('context is not defined');
    let item = await this.get(id, relations);

    if (!item) {
      item = await creator();
      item.id = id;
      this.add(item);
    }

    return item;
  }

  //TODO: optimize deletion
  async remove(id: ID, soft = false): Promise<void> {
    if (!this.store) {
      throw new Error('context is not defined');
    }
    const item = await this.get(id);

    if (item) {
      this.entitiesMap.delete(id);
      if (await this.store.findOneBy(this.entity, { id: item.id } as any)) {
        if (soft) {
          await this.store.em().softRemove(this.entity, item);
        } else {
          await this.store.remove(item);
        }
      }
    }
  }

  /**
   * Save all entities from local cache at once.
   * This action should be evoked in the end of batch data processing flow.
   */
  async saveAll(): Promise<void> {
    if (!this.store) {
      throw new Error('context is not defined');
    }

    const entitiesList = [...this.entitiesMap.values()];

    await this.store.save(entitiesList);
  }

  /**
   * Clears current cache
   */
  async resetAll(): Promise<void> {
    this.entitiesMap.clear();
  }

  /**
   * Add entity ID to the list for prefetch process.
   */
  addPrefetchItemId(itemIdOrList: ID | ID[]): void {
    if (Array.isArray(itemIdOrList)) {
      this.prefetchItemIdsList.push(...itemIdOrList);
    } else {
      this.prefetchItemIdsList.push(itemIdOrList);
    }
  }

  /**
   * Clear collected list of entity IDs for prefetch process.
   */
  resetPrefetchItemIdsList(): void {
    this.prefetchItemIdsList = [];
  }

  /**
   * Prefetch entities which are collected in the beginning of the batch
   * data processing flow.
   *
   * @param relations
   */
  async prefetchEntities(relations?: FindOptionsRelations<Entity>): Promise<void> {
    if (!this.store) throw new Error('context is not defined');
    if (!this.prefetchItemIdsList || this.prefetchItemIdsList.length === 0) {
      return;
    }

    for (const chunk of splitIntoBatches(this.prefetchItemIdsList, 1000)) {
      const ids = chunk.map((cid) => cid);
      const idsNotInCache = ids.filter((id) => !this.entitiesMap.has(id));

      const chunkRes = await this.store.find(this.entity, {
        where: {
          id: In(idsNotInCache),
        } as FindOptionsWhere<Entity>,
        ...(!!relations && { relations }),
      });

      for (const chunkResItem of chunkRes) {
        this.add(chunkResItem);
      }
    }

    this.resetPrefetchItemIdsList();
  }
}
