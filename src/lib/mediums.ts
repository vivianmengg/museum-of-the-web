export type Medium = {
  id: string;
  label: string;
  keywords: string[];   // matched against medium field (OR)
  color: string;
};

export const MEDIUMS: Medium[] = [
  {
    id: "photography",
    label: "Photographs",
    keywords: ["gelatin silver", "photograph", "daguerreotype", "chromogenic", "albumen", "cyanotype", "tintype", "photogravure", "platinum print", "palladium print"],
    color: "#6b7280",
  },
  {
    id: "painting",
    label: "Painting",
    keywords: ["oil on canvas", "oil on panel", "oil on board", "oil on copper", "tempera on panel", "tempera on canvas", "acrylic on canvas", "acrylic on panel", "egg tempera", "encaustic", "fresco"],
    color: "#b45309",
  },
  {
    id: "drawing",
    label: "Drawing",
    keywords: ["watercolor", "gouache", "pastel", "chalk", "charcoal", "pen and ink", "brush and ink", "ink on paper", "graphite", "pencil", "colored pencil"],
    color: "#0369a1",
  },
  {
    id: "prints",
    label: "Prints & Posters",
    keywords: ["etching", "woodblock", "lithograph", "woodcut", "engraving", "aquatint", "mezzotint", "screenprint", "silkscreen", "linocut", "drypoint", "intaglio", "monotype", "poster", "broadside"],
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
    label: "Bronze & Copper",
    keywords: ["bronze", "copper", "brass", "copper alloy"],
    color: "#854d0e",
  },
  {
    id: "metalwork",
    label: "Gold & Silver",
    keywords: ["gold", "silver", "gilt", "niello", "filigree", "repoussé"],
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
