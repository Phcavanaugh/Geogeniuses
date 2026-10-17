import json, math, os, time, urllib.request, urllib.parse
os.makedirs('skidata/z15', exist_ok=True)
os.makedirs('skidata/z12', exist_ok=True)

def get(url, data=None):
    for i in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': 'geogeniuses-ski-data/1.0'})
            return urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            print('retry', url, e)
            time.sleep(5 * (i + 1))
    raise SystemExit('failed ' + url)

S, W, N, E = 40.420, -106.830, 40.490, -106.730
q = f"""[out:json][timeout:120];
(
  way["piste:type"="downhill"]({S},{W},{N},{E});
  relation["piste:type"="downhill"]({S},{W},{N},{E});
  way["aerialway"]({S},{W},{N},{E});
  node["aerialway"]({S},{W},{N},{E});
  way["natural"="wood"]({S},{W},{N},{E});
  way["landuse"="forest"]({S},{W},{N},{E});
  way["landuse"="winter_sports"]({S},{W},{N},{E});
  way["building"]({S},{W},{N},{E});
  way["highway"]({S},{W},{N},{E});
  node["natural"="peak"]({S},{W},{N},{E});
);
out geom tags;"""
d = get('https://overpass-api.de/api/interpreter', urllib.parse.urlencode({'data': q}).encode())
open('skidata/osm.json', 'wb').write(d)
print('osm bytes', len(d))

def tiles(z, s, w, n, e):
    def tx(lon): return int((lon + 180) / 360 * 2**z)
    def ty(lat):
        r = math.radians(lat)
        return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**z)
    return [(x, y) for x in range(tx(w), tx(e) + 1) for y in range(ty(n), ty(s) + 1)]

for z, box in ((15, (S, W, N, E)), (12, (40.25, -107.05, 40.65, -106.50))):
    ts = tiles(z, *box)
    for x, y in ts:
        open(f'skidata/z{z}/{x}_{y}.png', 'wb').write(get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'))
    print('z', z, len(ts))
