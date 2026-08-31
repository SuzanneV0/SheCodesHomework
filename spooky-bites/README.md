# Spooky Bites 🧁

A small, static Halloween **baking** website — recipes, decorating techniques, a
party menu planner, a "what's your baking style" quiz, and a live countdown to
October 31st. Built as a sibling to
[Spookology](https://github.com/SuzanneV0/spookology), with a vintage
"apothecary / occult editorial" look: deep aubergine, bone paper, and antique
gold, set in Playfair Display and Ysabeau.

## Features

- Live countdown timer to Halloween
- Light / dark theme toggle (saved in `localStorage`)
- Hamburger navigation on tablet and phone widths
- Newsletter modal and contact form (front-end demos, no backend)
- Baking-style quiz with tallied results
- Menu planner with a checklist that persists in `localStorage`
- Full recipe pages with a print stylesheet
- Custom 404, `robots.txt`, and `sitemap.xml`
- No build step — just open `index.html` in a browser

## Getting Started

Open `index.html` directly in your browser, or serve the folder locally:

```bash
npx serve .
```

## Project Structure

```
spooky-bites/
├── index.html            # Home: countdown, about, featured bakes, newsletter modal
├── recipes.html          # 10 Halloween bakes (some link to full recipes)
├── recipes/              # Individual recipe pages
├── techniques.html       # Baking techniques article
├── menu-planner.html     # Party menu planner checklist
├── quiz.html             # "What is your Halloween baking style?" quiz
├── about.html            # About the site
├── contact.html          # Contact form
├── terms.html            # Terms of Use
├── privacy.html          # Privacy Policy
├── cookies.html          # Cookie Policy
├── 404.html              # Custom not-found page
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── css/
│   └── style.css         # Theme tokens + all styles
├── js/
│   ├── countdown.js      # Countdown logic (home page)
│   ├── site.js           # Theme toggle + hamburger nav + newsletter modal
│   ├── quiz.js           # Quiz scoring
│   ├── planner.js        # Menu planner persistence
│   └── contact.js        # Contact form handling
└── README.md
```

## Colours

| Token | Light | Role |
| --- | --- | --- |
| Aubergine | `#241019` | Navigation, footer, hero and panels |
| Bone paper | `#f2e9d6` | Page background |
| Antique gold | `#b0852f` | Links, focus rings, heading rules, hover glow |
| Oxblood | `#7a2438` | Buttons, checkbox accents |

Each has a matching dark-mode value defined in `css/style.css`.
