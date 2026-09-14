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
};

export function loadContentPack(): Promise<ContentPack> {
  return Promise.resolve(defaultPack);
}
