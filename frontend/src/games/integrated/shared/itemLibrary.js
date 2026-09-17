/**
 * One shared library of familiar, culturally neutral-to-Indian everyday objects.
 *
 * Every visual game draws from here, so adding a new object benefits all games
 * and translators only maintain one set of labels.
 *
 * similarityGroup drives the "similar distractors" difficulty parameter:
 * items in the same group are visually or semantically confusable.
 */

export const ITEM_CATEGORIES = {
  FOOD: 'food',
  CLOTHING: 'clothing',
  TRANSPORT: 'transport',
  TOOLS: 'tools',
  HOUSEHOLD: 'household',
};

export const ITEMS = [
  // Food
  { id: 'apple', emoji: '🍎', labelKey: 'games.items.apple', category: 'food', similarityGroup: 'fruit' },
  { id: 'banana', emoji: '🍌', labelKey: 'games.items.banana', category: 'food', similarityGroup: 'fruit' },
  { id: 'mango', emoji: '🥭', labelKey: 'games.items.mango', category: 'food', similarityGroup: 'fruit' },
  { id: 'rice', emoji: '🍚', labelKey: 'games.items.rice', category: 'food', similarityGroup: 'meal' },
  { id: 'bread', emoji: '🍞', labelKey: 'games.items.bread', category: 'food', similarityGroup: 'meal' },
  { id: 'egg', emoji: '🥚', labelKey: 'games.items.egg', category: 'food', similarityGroup: 'meal' },
  { id: 'tea', emoji: '☕', labelKey: 'games.items.tea', category: 'food', similarityGroup: 'drink' },
  { id: 'milk', emoji: '🥛', labelKey: 'games.items.milk', category: 'food', similarityGroup: 'drink' },

  // Clothing
  { id: 'shirt', emoji: '👕', labelKey: 'games.items.shirt', category: 'clothing', similarityGroup: 'garment' },
  { id: 'sari', emoji: '🥻', labelKey: 'games.items.sari', category: 'clothing', similarityGroup: 'garment' },
  { id: 'scarf', emoji: '🧣', labelKey: 'games.items.scarf', category: 'clothing', similarityGroup: 'garment' },
  { id: 'shoes', emoji: '👟', labelKey: 'games.items.shoes', category: 'clothing', similarityGroup: 'footwear' },
  { id: 'socks', emoji: '🧦', labelKey: 'games.items.socks', category: 'clothing', similarityGroup: 'footwear' },
  { id: 'cap', emoji: '🧢', labelKey: 'games.items.cap', category: 'clothing', similarityGroup: 'headwear' },

  // Transport
  { id: 'bus', emoji: '🚌', labelKey: 'games.items.bus', category: 'transport', similarityGroup: 'road_vehicle' },
  { id: 'car', emoji: '🚗', labelKey: 'games.items.car', category: 'transport', similarityGroup: 'road_vehicle' },
  { id: 'rickshaw', emoji: '🛺', labelKey: 'games.items.rickshaw', category: 'transport', similarityGroup: 'road_vehicle' },
  { id: 'bicycle', emoji: '🚲', labelKey: 'games.items.bicycle', category: 'transport', similarityGroup: 'two_wheeler' },
  { id: 'train', emoji: '🚆', labelKey: 'games.items.train', category: 'transport', similarityGroup: 'rail' },
  { id: 'boat', emoji: '🛶', labelKey: 'games.items.boat', category: 'transport', similarityGroup: 'water' },

  // Tools
  { id: 'hammer', emoji: '🔨', labelKey: 'games.items.hammer', category: 'tools', similarityGroup: 'hand_tool' },
  { id: 'wrench', emoji: '🔧', labelKey: 'games.items.wrench', category: 'tools', similarityGroup: 'hand_tool' },
  { id: 'screwdriver', emoji: '🪛', labelKey: 'games.items.screwdriver', category: 'tools', similarityGroup: 'hand_tool' },
  { id: 'scissors', emoji: '✂️', labelKey: 'games.items.scissors', category: 'tools', similarityGroup: 'cutting' },
  { id: 'saw', emoji: '🪚', labelKey: 'games.items.saw', category: 'tools', similarityGroup: 'cutting' },

  // Household
  { id: 'key', emoji: '🔑', labelKey: 'games.items.key', category: 'household', similarityGroup: 'small_object' },
  { id: 'glasses', emoji: '👓', labelKey: 'games.items.glasses', category: 'household', similarityGroup: 'small_object' },
  { id: 'clock', emoji: '🕰️', labelKey: 'games.items.clock', category: 'household', similarityGroup: 'furnishing' },
  { id: 'lamp', emoji: '🪔', labelKey: 'games.items.lamp', category: 'household', similarityGroup: 'furnishing' },
  { id: 'chair', emoji: '🪑', labelKey: 'games.items.chair', category: 'household', similarityGroup: 'furnishing' },
  { id: 'book', emoji: '📖', labelKey: 'games.items.book', category: 'household', similarityGroup: 'paper' },
  { id: 'umbrella', emoji: '☂️', labelKey: 'games.items.umbrella', category: 'household', similarityGroup: 'carried' },
  { id: 'plant', emoji: '🪴', labelKey: 'games.items.plant', category: 'household', similarityGroup: 'furnishing' },
  { id: 'spoon', emoji: '🥄', labelKey: 'games.items.spoon', category: 'household', similarityGroup: 'kitchen' },
  { id: 'broom', emoji: '🧹', labelKey: 'games.items.broom', category: 'household', similarityGroup: 'cleaning' },
];

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function getItemById(id) {
  return BY_ID.get(id);
}

/**
 * @param {Object} [filters]
 * @param {string[]} [filters.categories]
 * @param {string[]} [filters.exclude]       item ids to leave out
 * @param {string} [filters.similarityGroup]
 */
export function getItems(filters = {}) {
  const { categories, exclude, similarityGroup } = filters;
  return ITEMS.filter((item) => {
    if (categories && !categories.includes(item.category)) return false;
    if (similarityGroup && item.similarityGroup !== similarityGroup) return false;
    if (exclude && exclude.includes(item.id)) return false;
    return true;
  });
}

/** Similarity groups that contain at least `minSize` items. */
export function getSimilarityGroups(minSize = 2, pool = ITEMS) {
  const groups = new Map();
  pool.forEach((item) => {
    const bucket = groups.get(item.similarityGroup) ?? [];
    bucket.push(item);
    groups.set(item.similarityGroup, bucket);
  });
  return [...groups.entries()]
    .filter(([, items]) => items.length >= minSize)
    .map(([group, items]) => ({ group, items }));
}
