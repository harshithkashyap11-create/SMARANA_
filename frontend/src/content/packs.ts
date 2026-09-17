import demoPacks from "./demo-packs.json";
export interface ContentItem {
  id: string;
  title: string;
  imageUrl: string;
  audioUrl?: string;
  color?: string;
  note?: string;
  tags?: Record<string, unknown>;
}
export interface ContentPack {
  provenance?: { region: string; language: string; source: "demo" | "regional"; nativeReview: "unreviewed" };
  family?: Array<ContentItem & { relationship: string }>;
  sounds?: ContentItem[];
  words?: ContentItem[];
  places?: ContentItem[];
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
  places: [
    { id: "home", title: "Home", imageUrl: "" },
    { id: "garden", title: "Garden", imageUrl: "" },
    { id: "market", title: "Market", imageUrl: "" },
    { id: "river", title: "River", imageUrl: "" },
  ],
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

export type RemotePack = {
  language?: string;
  content_status?: string;
  region?: string;
  version: string;
  items: Record<
    string,
    Array<{
      id: string;
      title: string;
      image_url: string | null;
      audio_url: string | null;
      tags: Record<string, unknown>;
    }>
  >;
};

function item(value: RemotePack["items"][string][number]): ContentItem {
  return {
    tags: value.tags,
    id: value.id,
    title: value.title,
    imageUrl: value.image_url ?? "",
    audioUrl: value.audio_url ?? undefined,
    note:
      typeof value.tags.notes === "string"
        ? value.tags.notes
        : typeof value.tags.note === "string"
          ? value.tags.note
          : undefined,
    color: typeof value.tags.color === "string" ? value.tags.color : undefined,
  };
}

export function packFromRemote(remote: RemotePack): ContentPack {
  const items = remote.items;
  const available = <T>(value: T[] | undefined) => value ?? [];
  const dishes = available(items.dish?.map(item));
  const festivals = available(items.festival?.map(item));
  const words = available(items.word?.map(item));
  return {
    sounds: items.sound?.map(item) ?? [],
    words: words,
    places: available(items.place?.map(item)),
    dishes,
    festivals,
    sequenceItems: words.map((word, index) => ({
      ...word,
      color:
        word.color ??
        defaultPack.sequenceItems[index % defaultPack.sequenceItems.length]!
          .color,
      note:
        word.note ??
        defaultPack.sequenceItems[index % defaultPack.sequenceItems.length]!
          .note,
    })),
    sortingItems: [
      ...dishes.map((value) => ({ ...value, category: "Food" })),
      ...festivals.map((value) => ({ ...value, category: "Festival" })),

    ],
    routineScenes: available(
      items.routine_scene?.map((value) => ({
        ...item(value),
        targets:
          (value.tags.targets as string[] | undefined) ??
          [],
        distractors:
          (value.tags.distractors as string[] | undefined) ??
          [],
      })),
    ),
    tunes: available(items.tune?.map(item)),
    activities: available(
      items.activity?.map((value) => ({
        ...item(value),
        steps:
          Array.isArray(value.tags.steps) && value.tags.steps.length >= 3
            ? (value.tags.steps as unknown[]).filter(
                (step): step is ContentItem =>
                  typeof step === "object" &&
                  step !== null &&
                  "id" in step &&
                  typeof step.id === "string" &&
                  "title" in step &&
                  typeof step.title === "string" &&
                  "imageUrl" in step &&
                  typeof step.imageUrl === "string",
              )
            : [],
      })),
    ),
  };
}

export async function loadPack(
  region = "AS",
  lang = "en",
): Promise<ContentPack> {
  const regionalDemo = (demoPacks as unknown as Record<string, RemotePack>)[region];
  // Repository demo packs contain English practice material only. No region/language substitution.
  const demonstration = lang === "en" && regionalDemo
    ? { ...packFromRemote(regionalDemo), provenance: { region, language: "en", source: "demo" as const, nativeReview: "unreviewed" as const } }
    : undefined;
  const cacheKey = `pack:${region}:${lang}`;
  let cachedPack: ContentPack | undefined;
  try {
    const { db } = await import("../db/schema");
    const cached = await db.contentPacks.get(cacheKey);
    const candidate = cached?.pack as ContentPack | undefined;
    cachedPack = candidate?.provenance?.region === region && candidate.provenance.language === lang ? candidate : undefined;
    const cachedVersion =
      typeof cached?.version === "string" ? cached.version : undefined;
    const response = await fetch(
      `/api/v1/content/pack/?region=${encodeURIComponent(region)}&lang=${encodeURIComponent(lang)}`,
      { headers: cachedVersion ? { "If-None-Match": cachedVersion } : {} },
    );
    if (response.status === 304 && cachedPack) return cachedPack;
    if (!response.ok) throw new Error("Content pack unavailable");
    const remote = (await response.json()) as RemotePack;
    if (remote.region !== region || remote.language !== lang) throw new Error("Content pack scope mismatch");
    if (!Object.values(remote.items).some((items) => items.length)) throw new Error("Empty content pack");
    const pack: ContentPack = { ...packFromRemote(remote), provenance: { region, language: lang, source: remote.content_status === "demo" ? "demo" : "regional", nativeReview: "unreviewed" } };
    await db.contentPacks.put({
      id: cacheKey,
      patientId: "public",
      deviceUpdatedAt: new Date().toISOString(),
      version: remote.version,
      pack,
    });
    const connection = navigator as Navigator & {
      connection?: { type?: string };
    };
    if (connection.connection?.type === "wifi")
      void Promise.allSettled(
        Object.values(remote.items)
          .flat()
          .flatMap((content) => [content.image_url, content.audio_url])
          .filter((url): url is string => Boolean(url))
          .map((url) => fetch(url)),
      );
    return pack;
  } catch {
    if (cachedPack) return cachedPack;
    if (demonstration) return demonstration;
    throw new Error(`Content unavailable for ${region}/${lang}`);
  }
}

export const loadContentPack = loadPack;
