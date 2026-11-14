# Induction - Day 1 (standalone copy of the Wix site)

A plain HTML/CSS/JS copy of **www.hronlineinductionday1.com**. Every page, pop-up,
button and link was captured from the Wix Editor preview and rebuilt so it works
without Wix.

## Open it

- **Quickest:** double-click `index.html` (it opens the Day 1 log-in page).
- **Like a real website (recommended):** in this folder run

  ```
  python -m http.server 8731
  ```

  then open http://localhost:8731/

- **Put it online:** upload the folder to any static host. `vercel.json` turns on clean URLs,
  so `director-s-message.html` is served at `/director-s-message` (the same path as on Wix).

## What's in the folder

| Path | What it is |
|---|---|
| `index.html` | Day 1 - Log in (the Wix home page) |
| `<page-url>.html` | One file per Wix page, named after the original page URL (47 pages) |
| `assets/site.css` | Styles used by the pages |
| `assets/site.js` | Behaviour: pop-ups, lightbox, slideshows, Pro Gallery links, forms, videos, scroll-to-top |
| `assets/popups.js` | The 14 Wix pop-ups (lightboxes) |
| `assets/sitemap.js` | Page list, gallery destinations, slides, videos |
| `NAVIGATION_MAP.md` | Every clickable element: original destination → recreated destination → status |

A pop-up can be opened directly with `#popup-<id>`, for example `index.html#popup-oubx0`.
The browser's Back button closes an open pop-up.

## Limits

- **Wix server features aren't recreated.** These are the page password, Wix Members sign-in and
  My Account, and the Wix Forms inbox. Form entries are checked and saved in the visitor's browser only.
- **Media still comes from Wix's public servers.** Images, videos and fonts load from Wix's media CDN.
  OpinionStage quizzes, POWR widgets and the linked Dropbox and Wix documents also load from their
  original hosts. You need to be online for these.
- **Phones get the desktop layout, scaled to fit.** Wix's separate mobile layout was not captured.
