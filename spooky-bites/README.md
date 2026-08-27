# Spooky Bites 🧁

A small, static Halloween **baking** website — recipes, decorating techniques, a
"what's your baking style" quiz, and a live countdown to October 31st. Built as a
sibling to [Spookology](https://github.com/SuzanneV0/spookology), themed in
marigold, orange, and purple.

## Features

- Live countdown timer to Halloween
- Light / dark theme toggle (saved in `localStorage`)
- Hamburger navigation on tablet and phone widths
- Newsletter modal and contact form (front-end demos, no backend)
- Baking-style quiz with tallied results
- No build step — just open `index.html` in a browser

## Getting Started

Open `index.html` directly in your browser, or serve the folder locally:

```bash
npx serve .
```

## Project Structure

```
spooky-bites/
├── index.html        # Home: countdown, about, featured bakes, newsletter modal
├── recipes.html      # 10 Halloween bakes
├── techniques.html   # Baking techniques article
├── quiz.html         # "What is your Halloween baking style?" quiz
├── contact.html      # Contact form
├── terms.html        # Terms of Use
├── privacy.html      # Privacy Policy
├── cookies.html      # Cookie Policy
├── css/
│   └── style.css     # Theme tokens + all styles
├── js/
│   ├── countdown.js  # Countdown logic (home page)
│   ├── site.js       # Theme toggle + hamburger nav + newsletter modal
│   ├── quiz.js       # Quiz scoring
│   └── contact.js    # Contact form handling
└── README.md
```

## Colours

| Token | Light | Role |
| --- | --- | --- |
| Purple | `#8a1a9c` | Navigation, footer, brand |
| Orange | `#d9641b` | Headings, buttons |
| Marigold | `#eaa521` | Accents, focus rings, hover glow |
