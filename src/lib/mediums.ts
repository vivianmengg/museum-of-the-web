export type Medium = {
  id: string;
  label: string;
  keywords: string[];   // matched against medium field (OR)
  color: string;
};

export const MEDIUMS: Medium[] = [
  {
    id: "photography",
    label: "Photography",
    keywords: ["gelatin silver", "photograph", "daguerreotype", "chromogenic", "albumen"],
    color: "#6b7280",
  },
  {
    id: "painting",
    label: "Painting",
    keywords: ["oil on canvas", "oil on panel", "tempera on panel", "acrylic on canvas"],
    color: "#b45309",
  },
  {
    id: "works-on-paper",
    label: "Works on Paper",
    keywords: ["watercolor", "gouache", "pastel"],
    color: "#0369a1",
  },
  {
    id: "printmaking",
    label: "Printmaking",
    keywords: ["etching", "woodblock", "lithograph", "woodcut", "engraving"],
    color: "#374151",
  },
  {
    id: "ceramics",
    label: "Ceramics",
    keywords: ["porcelain", "earthenware", "stoneware", "faience"],
    color: "#92400e",
  },
  {
    id: "glass",
    label: "Glass",
    keywords: ["glass"],
    color: "#0891b2",
  },
  {
    id: "bronze",
    label: "Bronze",
    keywords: ["bronze"],
    color: "#854d0e",
  },
  {
    id: "metalwork",
    label: "Gold & Metalwork",
    keywords: ["silver gilt", "gilt copper", "repoussé", "copper alloy"],
    color: "#a16207",
  },
  {
    id: "silk",
    label: "Silk & Textile",
    keywords: ["silk", "embroidery", "tapestry", "brocade"],
    color: "#7e22ce",
  },
  {
    id: "wood",
    label: "Wood & Lacquer",
    keywords: ["lacquer", "lacquerware", "boxwood"],
    color: "#78350f",
  },
  {
    id: "stone",
    label: "Stone & Marble",
    keywords: ["marble", "limestone", "sandstone", "alabaster"],
    color: "#9ca3af",
  },
  {
    id: "jade",
    label: "Jade",
    keywords: ["jade", "nephrite", "jadeite"],
    color: "#15803d",
  },
];
