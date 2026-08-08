// Auto-generated from the Style-It prototype. Carved flat, no-body product cutouts.
export type Piece = {
  src: string;
  /** Optional because a piece may be in the picker before its label is known.
   *  The caption then shows the garment alone — the one thing not to do is put a
   *  guessed name under someone else's photograph. */
  brand?: string;
  label: string;
  /** Carried for every piece but currently read by nothing. */
  color: string;
  /** Per-piece width cap on the ARTWORK, in px. Above the frame width it lets a
   *  wide silhouette overflow the frame rather than render short; below it, it
   *  holds a piece at its established size while the frame grows.
   *  Deliberately NOT applied to the frame: the arrows are positioned by the
   *  frame, so a per-piece frame makes them jump as you cycle.
   *  The artwork touches an arrow at `frame.w + 24` (a 12px gap either side), so
   *  that is the hard ceiling: 172 for a dress (148 frame), 194 for a top or
   *  bottom (170 frame). Only the dresses use it — tops and bottoms are capped by
   *  height and none of them reaches the frame's width. */
  maxW?: number;
  /** Per-piece height cap on the ARTWORK, in px, overriding the slot's own.
   *
   *  Set so every top covers the same area of CLOTH, not so every top occupies
   *  the same height. Those are different: a tall narrow garment — the Textured
   *  Top, whose asymmetric hem runs to a point — spends its height on shape
   *  rather than fabric, and at a common 150px height covered 0.72x the ink of
   *  the median piece while the Olive Print covered 1.22x. It read as smaller,
   *  because it was.
   *
   *  Each value is `sqrt(target / (inkFraction * w * h)) * h`, with target the
   *  median ink area — so the middle of the set barely moves and the outliers
   *  come to it. Recompute if a piece's artwork is replaced. */
  maxH?: number;
};
export const STYLE_PIECES: { tops: Piece[]; bottoms: Piece[]; dresses: Piece[] } = {
  "tops": [
    {
      "src": "/style-it/top_8-v2.webp",
      "brand": "Hijab Boutique",
      "label": "Oversized Top",
      "color": "#d5ada4",
      "maxH": 140
    },
    {
      "src": "/style-it/top_9-v2.webp",
      "brand": "Hijab Boutique",
      "label": "Ruffle Blouse",
      "color": "#f7e4a9",
      "maxH": 147
    },
    {
      "src": "/style-it/top_11-v2.webp",
      "brand": "Jawda",
      "label": "Olive Print Top",
      "color": "#9f947a",
      "maxH": 136
    },
    {
      "src": "/style-it/top_0-v2.webp",
      "brand": "Veiled",
      "label": "Rouched Top",
      "color": "#cab8a1",
      "maxH": 157
    },
    {
      "src": "/style-it/top_1-v2.webp",
      "brand": "Glow Modesty",
      "label": "Poplin Shirt",
      "color": "#4b2e2a",
      "maxH": 147
    },
    {
      "src": "/style-it/top_3-v2.webp",
      "brand": "PLT",
      "label": "Cape Ruched Top",
      "color": "#ecded7",
      "maxH": 163
    },
    {
      "src": "/style-it/top_4-v2.webp",
      "brand": "Veiled",
      "label": "Layla Top",
      "color": "#d8a676",
      "maxH": 145
    },
    {
      "src": "/style-it/top_5-v2.webp",
      "brand": "Veiled",
      "label": "Textured Top",
      "color": "#442f34",
      "maxH": 176
    },
    {
      "src": "/style-it/top_6-v2.webp",
      "brand": "Veiled",
      "label": "Knit Drape Top",
      "color": "#e5c8bf",
      "maxH": 153
    }
  ],
  "bottoms": [
    {
      "src": "/style-it/bottom_7-v2.webp",
      "brand": "Nasiba",
      "label": "Solace Wide Leg",
      "color": "#545253"
    },
    {
      "src": "/style-it/bottom_8-v2.webp",
      "brand": "Merrachi",
      "label": "Frayed Hem Pants",
      "color": "#d6cdbb"
    },
    {
      "src": "/style-it/bottom_0-v2.webp",
      "brand": "Niswa",
      "label": "Maha Pleated",
      "color": "#503325"
    },
    {
      "src": "/style-it/bottom_2-v2.webp",
      "brand": "Glow Modesty",
      "label": "Gilded Maxi",
      "color": "#746440"
    },
    {
      "src": "/style-it/bottom_3-v2.webp",
      "brand": "Bershka",
      "label": "Flare Jean",
      "color": "#7492ab"
    },
    {
      "src": "/style-it/bottom_4-v2.webp",
      "brand": "PLT",
      "label": "Satin Maxi Skirt",
      "color": "#eed1cf"
    },
    {
      "src": "/style-it/bottom_5-v2.webp",
      "brand": "Veiled",
      "label": "Layla Pants",
      "color": "#d4a072"
    },
    {
      "src": "/style-it/bottom_6-v2.webp",
      "brand": "Veiled",
      "label": "Leather Pants",
      "color": "#4e1f2a"
    }
  ],
  "dresses": [
    {
      "src": "/style-it/dress_0.webp",
      "brand": "Glow Modesty",
      "label": "Floral Chiffon",
      "color": "#dfb7b9",
      "maxW": 145
    },
    {
      "src": "/style-it/dress_2.webp",
      "brand": "Glow Modesty",
      "label": "Celestia Maxi",
      "color": "#b0be9d"
    },
    {
      "src": "/style-it/dress_3.webp",
      "brand": "Niswa",
      "label": "Chiffon Maxi",
      "color": "#746647"
    },
    {
      "src": "/style-it/dress_4.webp",
      "brand": "Veiled",
      "label": "Butterfly Abaya",
      "color": "#1c2c24",
      "maxW": 168
    }
  ]
};
