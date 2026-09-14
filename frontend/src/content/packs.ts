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

export function loadContentPack(): Promise<ContentPack> {
  return Promise.resolve(defaultPack);
}
