export interface ContentItem {
  id: string;
  title: string;
  imageUrl: string;
  color?: string;
  note?: string;
}
export interface ContentPack {
  dishes: ContentItem[];
  festivals: ContentItem[];
  sequenceItems: ContentItem[];
  sortingItems: Array<ContentItem & { category: string }>;
  routineScenes: Array<
    ContentItem & { targets: string[]; distractors: string[] }
  >;
  tunes: ContentItem[];
  activities: Array<ContentItem & { steps: ContentItem[] }>;
}

export const defaultPack: ContentPack = {
  dishes: [
    { id: "tea", title: "A cup of tea", imageUrl: "/content/default/tea.svg" },
    {
      id: "rice",
      title: "A bowl of rice",
      imageUrl: "/content/default/rice.svg",
    },
    {
      id: "fruit",
      title: "Fresh fruit",
      imageUrl: "/content/default/fruit.svg",
    },
    {
      id: "bread",
      title: "Fresh bread",
      imageUrl: "/content/default/bread.svg",
    },
    {
      id: "sweets",
      title: "Festival sweets",
      imageUrl: "/content/default/sweets.svg",
    },
  ],
  festivals: [
    {
      id: "lamp",
      title: "Festival lamp",
      imageUrl: "/content/default/lamp.svg",
    },
    {
      id: "flowers",
      title: "Festival flowers",
      imageUrl: "/content/default/flowers.svg",
    },
    {
      id: "drum",
      title: "Festival drum",
      imageUrl: "/content/default/drum.svg",
    },
    {
      id: "kite",
      title: "Festival kite",
      imageUrl: "/content/default/kite.svg",
    },
    {
      id: "dance",
      title: "Festival dance",
      imageUrl: "/content/default/dance.svg",
    },
  ],
  sequenceItems: [
    { id: "sun", title: "Sun", imageUrl: "", color: "#f4b942", note: "C" },
    { id: "leaf", title: "Leaf", imageUrl: "", color: "#68a357", note: "D" },
    { id: "sky", title: "Sky", imageUrl: "", color: "#5b8def", note: "E" },
    {
      id: "flower",
      title: "Flower",
      imageUrl: "",
      color: "#d77fa1",
      note: "G",
    },
    { id: "earth", title: "Earth", imageUrl: "", color: "#9b7653", note: "A" },
    { id: "moon", title: "Moon", imageUrl: "", color: "#806fb3", note: "B" },
    { id: "water", title: "Water", imageUrl: "", color: "#43a6c6", note: "D" },
    { id: "mango", title: "Mango", imageUrl: "", color: "#e7903c", note: "F" },
  ],
  sortingItems: [
    {
      id: "tea",
      title: "Tea",
      imageUrl: "/content/default/tea.svg",
      category: "Food",
    },
    {
      id: "rice",
      title: "Rice",
      imageUrl: "/content/default/rice.svg",
      category: "Food",
    },
    {
      id: "drum",
      title: "Drum",
      imageUrl: "/content/default/drum.svg",
      category: "Festival",
    },
    {
      id: "lamp",
      title: "Lamp",
      imageUrl: "/content/default/lamp.svg",
      category: "Festival",
    },
    {
      id: "basket",
      title: "Basket",
      imageUrl: "/content/default/bread.svg",
      category: "Tool",
    },
    {
      id: "spade",
      title: "Spade",
      imageUrl: "/content/default/kite.svg",
      category: "Tool",
    },
    {
      id: "flower",
      title: "Flower",
      imageUrl: "/content/default/flowers.svg",
      category: "Nature",
    },
    {
      id: "fruit",
      title: "Fruit",
      imageUrl: "/content/default/fruit.svg",
      category: "Nature",
    },
  ],
  routineScenes: [
    {
      id: "tea-garden",
      title: "Tea garden",
      imageUrl: "/content/default/tea-garden.svg",
      targets: ["ripe leaf", "butterfly", "bird", "flower", "basket", "sun"],
      distractors: [
        "cloud",
        "stone",
        "hut",
        "tree",
        "path",
        "fence",
        "pond",
        "hat",
      ],
    },
  ],
  tunes: [
    { id: "bihu", title: "Bihu rhythm", imageUrl: "", note: "C,D,E,G,A,B,D,F" },
  ],
  activities: [
    {
      id: "make-tea",
      title: "Making tea",
      imageUrl: "/content/default/tea.svg",
      steps: [
        {
          id: "fill",
          title: "Fill the kettle",
          imageUrl: "/content/default/water.svg",
        },
        {
          id: "boil",
          title: "Boil the water",
          imageUrl: "/content/default/tea.svg",
        },
        {
          id: "leaves",
          title: "Add the tea leaves",
          imageUrl: "/content/default/leaf.svg",
        },
        {
          id: "pour",
          title: "Pour into the cup",
          imageUrl: "/content/default/tea.svg",
        },
        {
          id: "serve",
          title: "Serve the tea",
          imageUrl: "/content/default/sweets.svg",
        },
        {
          id: "sit",
          title: "Sit comfortably",
          imageUrl: "/content/default/bread.svg",
        },
        {
          id: "enjoy",
          title: "Enjoy your tea",
          imageUrl: "/content/default/tea.svg",
        },
      ],
    },
  ],
};

type RemotePack = { version: string; items: Record<string, Array<{ id: string; title: string; image_url: string | null; audio_url: string | null; tags: Record<string, unknown> }>> };

function item(value: RemotePack["items"][string][number]): ContentItem {
  return { id: value.id, title: value.title, imageUrl: value.image_url ?? "", note: value.audio_url ?? undefined };
}

export function packFromRemote(remote: RemotePack): ContentPack {
  const items = remote.items;
  const fallback = <T,>(value: T[] | undefined, base: T[]) => value?.length ? value : base;
  const dishes = fallback(items.dish?.map(item), defaultPack.dishes);
  const festivals = fallback(items.festival?.map(item), defaultPack.festivals);
  const words = fallback(items.word?.map(item), defaultPack.sequenceItems);
  return {
    dishes,
    festivals,
    sequenceItems: words,
    sortingItems: [...dishes.map((value) => ({ ...value, category: "Food" })), ...festivals.map((value) => ({ ...value, category: "Festival" }))],
    routineScenes: fallback(items.routine_scene?.map((value) => ({ ...item(value), targets: (value.tags.targets as string[] | undefined) ?? defaultPack.routineScenes[0]!.targets, distractors: (value.tags.distractors as string[] | undefined) ?? defaultPack.routineScenes[0]!.distractors })), defaultPack.routineScenes),
    tunes: fallback(items.tune?.map(item), defaultPack.tunes),
    activities: fallback(items.activity?.map((value) => ({ ...item(value), steps: defaultPack.activities[0]!.steps })), defaultPack.activities),
  };
}

export async function loadPack(region = "AS", lang = "en"): Promise<ContentPack> {
  const cacheKey = `pack:${region}:${lang}`;
  try {
    const { db } = await import("../db/schema");
    const cached = await db.contentPacks.get(cacheKey);
    const cachedVersion = typeof cached?.version === "string" ? cached.version : undefined;
    const response = await fetch(`/api/v1/content/pack/?region=${encodeURIComponent(region)}&lang=${encodeURIComponent(lang)}`, { headers: cachedVersion ? { "If-None-Match": cachedVersion } : {} });
    if (response.status === 304 && cached?.pack) return cached.pack as ContentPack;
    if (!response.ok) throw new Error("Content pack unavailable");
    const remote = await response.json() as RemotePack;
    const pack = packFromRemote(remote);
    await db.contentPacks.put({ id: cacheKey, patientId: "public", deviceUpdatedAt: new Date().toISOString(), version: remote.version, pack });
    const connection = navigator as Navigator & { connection?: { type?: string } };
    if (connection.connection?.type === "wifi") void Promise.all(Object.values(remote.items).flat().map((content) => content.image_url ?? content.audio_url).filter((url): url is string => Boolean(url)).map((url) => fetch(url)));
    return pack;
  } catch {
    return defaultPack;
  }
}

export const loadContentPack = loadPack;
