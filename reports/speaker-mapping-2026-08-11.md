# Sermon speakers — mapping for review

Generated 2026-08-11T07:26:52.673Z · **read-only, nothing written to Payload**

95 distinct strings on the website collapse to **60 people**.

| | Count |
|---|---:|
| Sermons with a speaker | 788 |
| Sermons with no speaker parsed | 21 |
| Distinct raw strings | 95 |
| Distinct people after clustering | 60 |
| Matched to an existing team member | 4 |
| Need a new team member | 56 |
| Uncertain — need your eyes | 0 |

## Merges you decided

From `config/sermon-speaker-overrides.json`, reapplied on every run.

- Michael Beard ← mike beard
- Steve Buchele ← steve buchele & pastor ryan robinson
- John Gascon ← john & kelli gascon

## Spellings folded together

Treated as one person: same given or family name, within a couple of
characters. Check none of these are actually two different people.

| Kept | Folded in |
|---|---|
| charlie mackenzie | charlie mckenzie |
| jacob bloemberg | jason bloemberg |
| daniel owens | daniel owen |
| regan miller | reagan miller |
| peter de fretes | peter defretes |
| michael beard | micheal beard |
| kester scandrett | kester scandrette |
| jacob bloemberg | jacob bloomberg |
| charlie mackenzie | charlie mcckenzie |

## Same surname, different given name

Possibly one person under a nickname, possibly two relatives. Not merged
automatically — decide each one. To merge, give them the same `teamId`
and set both to `link`.

- **Beka Riese** (2) · **Andrew Riese** (1)
- **David Young** (2) · **Terry Young** (1)

## First-name-only, more than one candidate

Deliberately left unmerged — a guess here would be a coin flip.

- **michael** could be: michael walls · michael beard

## Everyone, by sermon count

| Person | Action | Sermons | Active | Variants on the website |
|---|---|---:|---|---|
| Jacob Bloemberg | link | 310 | 2015–2026 | Pastor Jacob Bloemberg · Pastor Jacob · Pastor Jason Bloemberg · PastorJacob Bloemberg · Jacob Bloemberg · Pastor Jacob Bloomberg |
| Jason Fizzard | create | 177 | 2019–2023 | Pastor Jason Fizzard · Jason Fizzard · Pastor Pastor Jason Fizzard |
| John Johnson | create | 69 | 2015–2016 | Pastor John Johnson |
| Charlie Mackenzie | create | 33 | 2015–2016 | Pastor Charlie Mackenzie · Pastor Charlie Mckenzie · Charlie Mckenzie · Pastor Charlie · Pastor Charlie MacKenzie · Charlie Mackenzie · Charlie Mcckenzie |
| Ryan Robinson | create | 28 | 2019–2021 | Pastor Ryan Robinson · Ryan Robinson |
| Kester Scandrett | link | 28 | 2021–2026 | Kester Scandrett · Mr. Kester · Pastor Kester · Pastor Kester Scandrett · Kester Scandrette |
| Jason Morris | link | 14 | 2022–2026 | Pastor Jason Morris |
| Nelson Annan | create | 11 | 2016–2016 | Pastor Nelson Annan |
| Daniel Owens | create | 10 | 2019–2023 | Pastor Daniel Owens · Pastor Daniel Owen · Daniel Owens |
| Michael Walls | create | 8 | 2021–2024 | Michael Walls |
| Michael Beard | create | 8 | 2023–2024 | Pastor Mike · Mike · Michael Beard · Pastor Michael Beard · Micheal Beard · Mike Beard |
| Steve Buchele | create | 7 | 2019–2020 | Pastor Steve Buchele · Pastor Steve Buchele & Pastor Ryan Robinson |
| Regan Miller | create | 7 | — | Pastor Regan Miller · Pastor Reagan Miller · Regan Miller |
| Peter de Fretes | link | 6 | 2021–2026 | Peter de Fretes · Pastor Peter DE FRETES · Peter De Fretes · Pastor Peter DeFretes |
| Luan | create | 6 | 2024–2024 | Pastor Luan |
| Jan Drayer | create | 5 | 2023–2023 | Pastor Jan Drayer |
| Mic Ngo | create | 5 | 2022–2024 | Mic Ngo · Pastor Mic Ngo · Ngo |
| Ariel Bloomer | create | 4 | 2022–2022 | Ariel · Ariel Bloomer |
| Todd Nelson | create | 3 | 2016–2016 | Pastor Todd Nelson |
| Roslyn Jackson | create | 2 | 2023–2024 | Roslyn Jackson |
| Beka Riese | create | 2 | 2023–2024 | Beka Riese |
| Jody Goodwin | create | 2 | 2023–2023 | Jody Goodwin |
| JV Sundersingh | create | 2 | 2021–2022 | JV Sundersingh |
| Hardwick Tchale | create | 2 | 2021–2021 | Hardwick Tchale |
| Matthias Morzuch | create | 2 | — | Pastor Matthias Morzuch |
| David Young | create | 2 | — | Pastor David Young |
| John Gascon | create | 2 | 2021–2021 | John Gascon · John & Kelli Gascon |
| Peter Lim | create | 1 | 2025–2025 | Pastor Peter Lim |
| Jim Rion | create | 1 | 2025–2025 | Rev. Jim Rion |
| Tony Rucinski | create | 1 | 2025–2025 | Dr. Tony Rucinski |
| Jose Zayas | create | 1 | 2024–2024 | Pastor Jose Zayas |
| David Chotka | create | 1 | 2024–2024 | Dr. David Chotka |
| Brian Stiller | create | 1 | 2024–2024 | Dr. Rev. Brian Stiller |
| Troy Murphy | create | 1 | 2024–2024 | Pastor Troy Murphy |
| Tim Costello | create | 1 | 2024–2024 | Rev. Tim Costello |
| Andrew Riese | create | 1 | 2024–2024 | Andrew Riese |
| Daniel Chung | create | 1 | 2024–2024 | Pastor Daniel Chung |
| Chris Ball | create | 1 | 2024–2024 | Pastor Chris Ball |
| Roy Tinklenberg | create | 1 | 2023–2023 | Pastor Roy Tinklenberg |
| Dave Roever | create | 1 | 2023–2023 | Pastor Dave Roever |
| Andrew & Beka | create | 1 | 2023–2023 | Andrew & Beka |
| John Luong | create | 1 | 2022–2022 | John Luong |
| David Fresh | create | 1 | — | Pastor David Fresh |
| Jhon Freeman | create | 1 | — | Pastor Jhon Freeman |
| Ray Bentley | create | 1 | — | Ray Bentley |
| Warren Reeve | create | 1 | — | Pastor Warren Reeve |
| Irvin Rutherford | create | 1 | — | Pastor Irvin Rutherford |
| Ryan Robinson@ My Dinh | create | 1 | — | Ryan Robinson@ My Dinh |
| Phil McNeill | create | 1 | — | Pastor Phil McNeill |
| Pat Copple | create | 1 | — | Pat Copple |
| David Durance | create | 1 | 2016–2016 | David Durance |
| Harv Matchullis at 11am Service PLAY MP3 by Pastor Harv Matchullis | create | 1 | 2015–2015 | Pastor Harv Matchullis at 11am Service PLAY MP3 by Pastor Harv Matchullis |
| Terry Young | create | 1 | 2016–2016 | Terry Young |
| Roberts | create | 1 | 2026–2026 | Pastor Roberts |
| Desmond | create | 1 | 2025–2025 | Dr. Desmond |
| Lao | create | 1 | 2023–2023 | Pastor Lao |
| Michael | create | 1 | 2022–2022 | Michael |
| Ben | create | 1 | — | Pastor Ben |
| Min | create | 1 | — | Pastor Min |
| Westlake | create | 1 | — | Westlake |

## How created speakers are configured

- `role`: **Guest Speaker** (the field is required)
- `staffMember`: **false** — the About page queries `staffMember: true`,
  so imported speakers stay off it while remaining available as sermon filters.

Sermons naming two speakers keep the first as `speaker`; the second is
recorded so the import can note them rather than lose them:

- `steve buchele & pastor ryan robinson` → also Ryan Robinson
- `john & kelli gascon` → also Kelli Gascon
