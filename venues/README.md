# Venue folders

## Folder index

| Venue | Address | Folder |
| --- | --- | --- |
| The Brass Door Pub — first place twinned | 2171 Rue Crescent, Montréal, QC H3G 2C1 | [The Brass Door Pub folder](brass-door/) |
| Hurley's Irish Pub | 1225 Rue Crescent, Montréal, QC H3G 2B1 | [Hurley's Irish Pub folder](hurleys/) |
| Sir Winston Churchill Pub Complexe | 1455-1459 Rue Crescent, Montréal, QC H3G 2B2 | [Sir Winston Churchill Pub Complexe folder](sir-winston-churchill/) |
| Brutopia | 1219 Rue Crescent, Montréal, QC H3G 2B1 | [Brutopia folder](brutopia/) |
| Ziggy's Pub | 1470 Rue Crescent, Montréal, QC H3G 2B6 | [Ziggy's Pub folder](ziggys/) |
| Wienstein & Gavino's | 1434 Rue Crescent, Montréal, QC H3G 2B6 | [Wienstein & Gavino's folder](wienstein-gavinos/) |

## Folder contract

There is one folder per location. The venue’s own [`venue.json`](brass-door/venue.json) record is the source of truth inside its folder; the same contract applies to every linked venue folder above. Nothing about a venue is stored outside its folder except the aggregate nightly digest.

Each venue folder reserves [`media/`](brass-door/media/), [`consent/`](brass-door/consent/), and [`scan/`](brass-door/scan/) for that location’s future photos and 3D room model, consent grants and signed participation record, and nightly scan history respectively.
