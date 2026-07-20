# Print Rewards — Customer Loyalty Tracker

A small local app for your printing shop. Tracks each customer's prints,
visits, and loyalty points by name/phone, gives them a discount automatically
on their next order, and lets customers register themselves by scanning one
QR code with their phone.

## What's in this folder

```
print-loyalty/
├── server.js          the app itself
├── loyalty.js         all the pricing/points/discount rules — edit numbers here
├── data/
│   └── customers.json   your customer list — plain text, safe to open and hand-edit
└── public/
    ├── index.html      staff dashboard (use this at the counter)
    └── register.html   customer sign-up page (this is what the QR code opens)
```

## One-time setup

1. Install [Node.js](https://nodejs.org) if you don't have it (the LTS version).
2. Open a terminal in this folder and run:
   ```
   npm install
   ```
3. Start the app:
   ```
   npm start
   ```
   You'll see something like:
   ```
   On this computer:  http://localhost:3000
   On your phone:      http://192.168.1.12:3000   (same WiFi network)
   Registration page:  http://192.168.1.12:3000/register.html
   ```

## Everyday use

- **On your computer:** open `http://localhost:3000` in a browser — this is
  your counter dashboard. Enter a customer's phone number and print count,
  hit **Preview** to see the discount, then **Confirm & Save Order**.
- **On your phone at the counter:** connect your phone to the *same WiFi* as
  the computer, then open the "On your phone" address shown in the terminal.
  The dashboard works exactly the same there.
- **New customer sign-up:** print the QR code shown on the dashboard (or the
  image at `http://localhost:3000/api/qrcode`) and stick it at the counter.
  Customers scan it, enter their name and phone, and they're registered —
  no typing needed on your end.
- **Editing data by hand:** open `data/customers.json` in any text editor.
  It's a plain list — you can fix a name, adjust points, or remove a test
  entry directly, then save the file. Just keep the app closed while you
  edit it, and restart it (`npm start`) afterward.

## The loyalty rules (edit these in `loyalty.js`)

- ₹4 per print, 1 point earned per ₹1 spent (so 1 point per print)
- 10 welcome bonus points on registration
- Discount tiers, applied automatically on the *next* order:

  | Points  | Tier    | Discount |
  |---------|---------|----------|
  | 0–24    | New     | 0%       |
  | 25–49   | Starter | 5%       |
  | 50–99   | Bronze  | 10%      |
  | 100–199 | Silver  | 15%      |
  | 200+    | Gold    | 20%      |

To change any of these numbers — the price per print, the welcome bonus, or
the tier thresholds/discounts — open `loyalty.js` and edit the values at the
top. Nothing else in the app needs to change.

## Notes

- This is designed to run on one computer at a time (yours). It's not meant
  to be exposed to the public internet — it's for your shop's local WiFi only.
  For a printing shop with one counter, this is normal and fine.
- Back up `data/customers.json` occasionally (just copy the file somewhere
  safe) since it's your only copy of customer data.
- If port 3000 is already used by something else, run `PORT=4000 npm start`
  instead, and use that port in the addresses above.
