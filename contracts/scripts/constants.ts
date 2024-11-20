export const BASE_METADATA_URI =
  'ipfs://QmZJiQiuVhGZ2UrEBAmDKTVN8QGmP8qj3fE1xz5tHJh2qc';

export const SKIN_COLLECTION_METADATA = `${BASE_METADATA_URI}/collection.json`;

export const CATALOG_METADATA_URI = `${BASE_METADATA_URI}/catalog/catalog.json`;
export const CATALOG_TYPE = 'image/png';

export const BACKGROUND_SLOT_METADATA = `${BASE_METADATA_URI}/catalog/slot/background.json`;
export const BODY_SLOT_METADATA = `${BASE_METADATA_URI}/catalog/slot/body.json`;
export const HEAD_SLOT_METADATA = `${BASE_METADATA_URI}/catalog/slot/head.json`;

export const BACKGROUND_Z_INDEX = 0;
export const SKIN_Z_INDEX = 1;
export const BODY_Z_INDEX = 2;
export const HEAD_Z_INDEX = 3;

export const IMAGE_URIS = [
  'ipfs://QmeBELRq3JxsynRp3HAx5CwWtvVqmX34ZeXyqjC5ugNAjW/body_01.png',
  'ipfs://QmeBELRq3JxsynRp3HAx5CwWtvVqmX34ZeXyqjC5ugNAjW/body_02.png',
  'ipfs://QmeBELRq3JxsynRp3HAx5CwWtvVqmX34ZeXyqjC5ugNAjW/body_03.png',
];
export const BASE_ANIMATION_URI_TEST =
  'https://nft-renderer-git-development-rmrk-team.vercel.app/nft/{chanId}/{contractAddress}/';
export const BASE_ANIMATION_URI_PROD =
  'https://nft-renderer.rmrk.app/nft/8453/{contractAddress}/';

export const FIXED_PART_METADATA_URIS = [
  `${BASE_METADATA_URI}/assets/01.json`,
  `${BASE_METADATA_URI}/assets/02.json`,
  `${BASE_METADATA_URI}/assets/03.json`,
];
export const FIXED_PART_IDS = [1n, 2n, 3n];

export const ME_EQUIPPABLE_GROUP_ID = 1n; // Only useful if we plan to equip it into something else.
export const SLOT_PART_BACKGROUND_ID = 1001n;
export const SLOT_PART_BODY_ID = 1002n;
export const SLOT_PART_HEAD_ID = 1003n;

export const BENEFICIARY = '0xA01984b6e00586CA61269eb966E588466c112F5b'; // Base Multisig
export const ROYALTIES_BPS = 300; // 3%

// PART TYPES (Defined by standard)
export const PART_TYPE_SLOT = 1;
export const PART_TYPE_FIXED = 2;

export const BILLBOARDS_COLLECTION_METADATA =
  'ipfs://QmdCjP93PfmsYb1hScjovdL8hdHt2EgqHSK7YCc1KrTYLg';

export const CATALOG_PARTS = [
  {
    partId: FIXED_PART_IDS[0],
    part: {
      itemType: PART_TYPE_FIXED,
      z: SKIN_Z_INDEX,
      equippable: [],
      metadataURI: FIXED_PART_METADATA_URIS[0],
    },
  },
  {
    partId: FIXED_PART_IDS[1],
    part: {
      itemType: PART_TYPE_FIXED,
      z: SKIN_Z_INDEX,
      equippable: [],
      metadataURI: FIXED_PART_METADATA_URIS[1],
    },
  },
  {
    partId: FIXED_PART_IDS[2],
    part: {
      itemType: PART_TYPE_FIXED,
      z: SKIN_Z_INDEX,
      equippable: [],
      metadataURI: FIXED_PART_METADATA_URIS[2],
    },
  },
  {
    partId: SLOT_PART_BACKGROUND_ID,
    part: {
      itemType: PART_TYPE_SLOT,
      z: BACKGROUND_Z_INDEX,
      equippable: [],
      metadataURI: BACKGROUND_SLOT_METADATA,
    },
  },
  {
    partId: SLOT_PART_BODY_ID,
    part: {
      itemType: PART_TYPE_SLOT,
      z: BODY_Z_INDEX,
      equippable: [],
      metadataURI: BODY_SLOT_METADATA,
    },
  },
  {
    partId: SLOT_PART_HEAD_ID,
    part: {
      itemType: PART_TYPE_SLOT,
      z: HEAD_Z_INDEX,
      equippable: [],
      metadataURI: HEAD_SLOT_METADATA,
    },
  },
];
