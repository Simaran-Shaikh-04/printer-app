// loyalty.js
// All the "business rules" for the loyalty program live here, in one place,
// so you (or Claude, later) can tune the numbers without touching server logic.

// ── Print type prices (rupees per page) ─────────────────────────────────────
const PRINT_TYPES = {
  color: { label: "Color Print", price: 10 },
  bw:    { label: "B&W Print",   price: 4  },
  xerox: { label: "Xerox",       price: 3  },
};

const WELCOME_BONUS_POINTS = 10; // given once, at registration

// Total rupees for a mixed order
function rupeesForOrder({ color = 0, bw = 0, xerox = 0 }) {
  return (
    color * PRINT_TYPES.color.price +
    bw    * PRINT_TYPES.bw.price    +
    xerox * PRINT_TYPES.xerox.price
  );
}

// 1 point earned per rupee spent
function pointsForRupees(rupees) {
  return rupees;
}

// Discount tiers, evaluated top-down. Edit freely.
const TIERS = [
  { min: 500, label: "Platinum", discountPct: 25 },
  { min: 200, label: "Gold",     discountPct: 20 },
  { min: 100, label: "Silver",   discountPct: 15 },
  { min: 50,  label: "Bronze",   discountPct: 10 },
  { min: 25,  label: "Starter",  discountPct: 5  },
  { min: 0,   label: "New",      discountPct: 0  },
];

function tierForPoints(points) {
  return TIERS.find((t) => points >= t.min);
}

function discountForPoints(points) {
  return tierForPoints(points).discountPct;
}

// Given quantities per type and the customer's CURRENT points balance,
// return a full breakdown of the order.
function priceOrder({ color = 0, bw = 0, xerox = 0 }, currentPoints) {
  const grossRupees   = rupeesForOrder({ color, bw, xerox });
  const tier          = tierForPoints(currentPoints);
  const discountRupees = Math.round((grossRupees * tier.discountPct) / 100);
  const netRupees     = grossRupees - discountRupees;
  const totalPrints   = color + bw + xerox;

  return {
    color, bw, xerox,
    totalPrints,
    grossRupees,
    tier: tier.label,
    discountPct: tier.discountPct,
    discountRupees,
    netRupees,
  };
}

module.exports = {
  PRINT_TYPES,
  WELCOME_BONUS_POINTS,
  TIERS,
  rupeesForOrder,
  pointsForRupees,
  tierForPoints,
  discountForPoints,
  priceOrder,
};
