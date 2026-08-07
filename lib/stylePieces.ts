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
   *  wide silhouette (an abaya) overflow the frame rather than render short;
   *  below it, it holds a piece at its established size while the frame grows.
   *  Deliberately NOT applied to the frame: the arrows are positioned by the
   *  frame, so a per-piece frame makes them jump as you cycle dresses.
   *  Ceiling is 168px — the 148px frame plus the 12px arrow gap either side, less
   *  2px so the artwork does not sit flush against a control. */
  maxW?: number;
};
export const STYLE_PIECES: { tops: Piece[]; bottoms: Piece[]; dresses: Piece[] } = {
  "tops": [
    {
      "src": "/style-it/top_7.png",
      "label": "Satin Collar Blouse",
      "color": "#8a7619"
    },
    {
      "src": "/style-it/top_8.png",
      "label": "Oversized Tee",
      "color": "#d5ada4"
    },
    {
      "src": "/style-it/top_9.png",
      "label": "Ruffle Blouse",
      "color": "#f7e4a9"
    },
    {
      "src": "/style-it/top_11.png",
      "label": "Printed High-Neck",
      "color": "#9f947a"
    },
    {
      "src": "/style-it/top_0.png",
      "brand": "Veiled",
      "label": "Rouched Top",
      "color": "#cab8a1"
    },
    {
      "src": "/style-it/top_1.png",
      "brand": "Glow Modesty",
      "label": "Poplin Shirt",
      "color": "#4b2e2a"
    },
    {
      "src": "/style-it/top_3.png",
      "brand": "PLT",
      "label": "Cape Ruched Top",
      "color": "#ecded7"
    },
    {
      "src": "/style-it/top_4.png",
      "brand": "Veiled",
      "label": "Layla Top",
      "color": "#d8a676"
    },
    {
      "src": "/style-it/top_5.png",
      "brand": "Veiled",
      "label": "Textured Top",
      "color": "#442f34"
    },
    {
      "src": "/style-it/top_6.png",
      "brand": "Veiled",
      "label": "Knit Drape Top",
      "color": "#e5c8bf"
    }
  ],
  "bottoms": [
    {
      "src": "/style-it/bottom_7.png",
      "label": "Wide-Leg Trouser",
      "color": "#545253"
    },
    {
      "src": "/style-it/bottom_8.png",
      "label": "Linen Wide-Leg",
      "color": "#d6cdbb"
    },
    {
      "src": "/style-it/bottom_0.png",
      "brand": "Niswa",
      "label": "Maha Pleated",
      "color": "#503325"
    },
    {
      "src": "/style-it/bottom_2.png",
      "brand": "Glow Modesty",
      "label": "Gilded Maxi",
      "color": "#746440"
    },
    {
      "src": "/style-it/bottom_3.png",
      "brand": "Bershka",
      "label": "Flare Jean",
      "color": "#7492ab"
    },
    {
      "src": "/style-it/bottom_4.png",
      "brand": "PLT",
      "label": "Satin Maxi Skirt",
      "color": "#eed1cf"
    },
    {
      "src": "/style-it/bottom_5.png",
      "brand": "Veiled",
      "label": "Layla Pants",
      "color": "#d4a072"
    },
    {
      "src": "/style-it/bottom_6.png",
      "brand": "Veiled",
      "label": "Leather Pants",
      "color": "#4e1f2a"
    }
  ],
  "dresses": [
    {
      "src": "/style-it/dress_0.png",
      "brand": "Glow Modesty",
      "label": "Floral Chiffon",
      "color": "#dfb7b9",
      "maxW": 145
    },
    {
      "src": "/style-it/dress_2.png",
      "brand": "Glow Modesty",
      "label": "Celestia Maxi",
      "color": "#b0be9d"
    },
    {
      "src": "/style-it/dress_3.png",
      "brand": "Niswa",
      "label": "Chiffon Maxi",
      "color": "#746647"
    },
    {
      "src": "/style-it/dress_4.png",
      "brand": "Veiled",
      "label": "Butterfly Abaya",
      "color": "#1c2c24",
      "maxW": 168
    }
  ]
};
