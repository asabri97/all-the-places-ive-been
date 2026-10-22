# All the places I've been

A small globe of places you have lived, been, and still want to see, plus the flights between them. It uses [Cobe](https://cobe.vercel.app/).

`data/` is the globe you edit. `example/` is a filled-in copy: 3 lived, 58 been, 23 wish, and 81 flights.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. That globe is the short sample in `data/`.

To open the filled-in example instead:

```bash
npm run example
```

## Add your places

Edit `data/places.csv`. One row per place. `status` is `lived`, `been`, or `wish`.

```csv
name,status,latitude,longitude,label
Berlin,lived,52.52,13.405,
Paris,been,48.8566,2.3522,
Reykjavík,wish,64.1466,-21.9426,Iceland
```

`label` is optional. Use it when the name on the globe should be shorter than the place name. If the same place appears twice, `lived` wins over `been`, and `been` wins over `wish`.

Each dot is a point at those coordinates, not a filled-in country.

## Add your flights

Export a CSV from [Flighty](https://flighty.com/) and save it as `data/flights.csv`. Any other CSV works if it has `From` and `To` airport codes. `Canceled` is optional. A canceled row is skipped. Everything else in the file, including seat, PNR, and notes, is ignored.

```csv
Date,From,To,Canceled
2024-06-01,JFK,LHR,false
2024-06-08,LHR,CDG,false
```

Repeated trips between the same airports become one line. The caption still counts every flight.

Airport coordinates come from [OurAirports](https://ourairports.com/) (David Megginson, public domain). You only need `data/airports.csv` when a code is missing or the city name is wrong. A row there replaces the built-in one:

```csv
code,city,latitude,longitude
BKF,Aurora,39.7018,-104.752
```

If two airports in your export share a city name, the label adds the code.

## The example

Lived: Germany, Pakistan, United States.

Been: Albania, Austria, Azerbaijan, Azores, Belgium, Bhutan, Brazil, Cambodia, Chile, China, Colombia, Costa Rica, Croatia, Cyprus, Czechia, Denmark, Egypt, England, France, Greece, Hungary, Ireland, Italy, Japan, Jordan, Kosovo, Latvia, Liechtenstein, Luxembourg, Madeira, Malaysia, Malta, Mauritius, Mexico, Morocco, Netherlands, Nicaragua, North Macedonia, Norway, Poland, Portugal, Romania, Saudi Arabia, Scotland, Seychelles, Singapore, South Korea, Spain, Sri Lanka, Sweden, Switzerland, Taiwan, Thailand, Turkey, United Arab Emirates, United Kingdom, Vatican, Wales.

Wish: New Zealand, Rwanda, Namibia, Mongolia, Kazakhstan, Uzbekistan, India, Papua New Guinea, Indonesia, Iceland, Kenya, Ethiopia, Lesotho, Madagascar, Tanzania, Armenia, Bahamas, Belize, Trinidad and Tobago, Guatemala, Cuba, Fiji, Antarctica.

The flight file in `example/flights.csv` is the same trips as a Flighty export, with only the date and the two airports kept. `example/airports.csv` gives those airports the city names used on the globe. `BKF` is Buckley in Aurora, Colorado, not the seaplane base that reuses that code.

To make that example the files `npm run dev` reads, copy them over `data/`:

```bash
cp example/places.csv data/places.csv
cp example/flights.csv data/flights.csv
cp example/airports.csv data/airports.csv
```
