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
    keywords: ["gelatin silver", "photograph", "daguerreotype", "chromogenic", "albumen", "cyanotype", "ambrotype", "tintype"],
    color: "#6b7280",
  },
  {
    id: "painting",
    label: "Painting",
    keywords: ["oil on canvas", "oil on panel", "oil on board", "tempera on panel", "tempera on wood", "acrylic on canvas", "encaustic"],
    color: "#b45309",
  },
  {
    id: "works-on-paper",
    label: "Works on Paper",
    keywords: ["watercolor", "gouache", "ink wash", "brush and ink", "chalk", "pastel"],
    color: "#0369a1",
  },
  {
    id: "printmaking",
    label: "Printmaking",
    keywords: ["etching", "lithograph", "woodblock", "woodcut", "engraving", "aquatint", "screenprint", "linocut", "mezzotint"],
    color: "#374151",
  },
  {
    id: "ceramics",
    label: "Ceramics",
    keywords: ["porcelain", "earthenware", "stoneware", "terracotta", "terra cotta", "faience", "ceramic", "pottery"],
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
    keywords: ["gold", "silver gilt", "gilt copper", "copper alloy", "repoussé", "chased gold", "hammered"],
    color: "#a16207",
  },
  {
    id: "silk",
    label: "Silk & Textile",
    keywords: ["silk", "textile", "embroidery", "tapestry", "brocade", "damask", "linen", "wool", "satin", "velvet"],
    color: "#7e22ce",
  },
  {
    id: "wood",
    label: "Wood & Lacquer",
    keywords: ["lacquer", "lacquerware", "wood", "oak", "walnut", "cedar", "boxwood"],
    color: "#78350f",
  },
  {
    id: "stone",
    label: "Stone & Marble",
    keywords: ["marble", "limestone", "sandstone", "granite", "basalt", "alabaster", "schist", "serpentine"],
    color: "#9ca3af",
  },
  {
    id: "jade",
    label: "Jade",
    keywords: ["jade", "nephrite", "jadeite"],
    color: "#15803d",
  },
];
