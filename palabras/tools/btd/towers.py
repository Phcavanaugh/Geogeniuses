import csv, json
D='/tmp/btd/'
W=list(csv.DictReader(open(D+'combat/weapons.csv',encoding='utf-8-sig')))
P=list(csv.DictReader(open(D+'combat/projectiles.csv',encoding='utf-8-sig')))
E=list(csv.DictReader(open(D+'combat/effects.csv',encoding='utf-8-sig')))
U=list(csv.DictReader(open(D+'combat/upgrade_prices.csv',encoding='utf-8-sig')))
F={r['model_id']:r for r in csv.DictReader(open(D+'economy/farms.csv',encoding='utf-8-sig'))}
num=lambda x,d=0: float(x) if x not in ('',None) else d
IMM={'Lead':'lead','Black':'black','Purple':'purple','White':'white','Frozen':'frozen'}
def imm(s): return [IMM[x.strip()] for x in s.split('|') if x.strip() in IMM]
# our tower -> (Bloons family, which Bloons path is our A, which is our B)
MAP={'gato':('DartMonkey',2,1),'dragon':('BombShooter',1,2),'pulpo':('GlueGunner',3,1),'huerto':('BananaFarm',1,2)}
out={}
for our,(fam,pa,pb) in MAP.items():
    ups={ (int(u['path']),int(u['tier'])):(u['name'],int(u['price_medium'])) for u in U if u['family_id']==fam and u['kind']!='paragon' and u['tier'] in '123' and u['tier']}
    T={'family':fam,'paths':[[ups[(pa,t)] for t in (1,2,3)],[ups[(pb,t)] for t in (1,2,3)]],'stats':{}}
    for a in range(4):
        for b in range(4):
            if a==3 and b==3: continue
            tiers=[0,0,0]; tiers[pa-1]=a; tiers[pb-1]=b
            mid=fam if tiers==[0,0,0] else fam+'-'+''.join(map(str,tiers))
            if fam=='BananaFarm':
                f=F.get(mid); T['stats'][f'{a}{b}']={'farm':int(num(f['income_per_round_before_bank_interest'])) if f else 80}; continue
            ws=[w for w in W if w['model_id']==mid and w['scope']=='placed tower']
            if not ws: print('no weapon',mid); continue
            st={'weapons':[]}
            for w in ws:
                ps=[p for p in P if p['model_id']==mid and p['weapon_path']==w['weapon_path']]
                root=[p for p in ps if not p['parent_projectile_path']]
                kids=[p for p in ps if p['parent_projectile_path']]
                r=root[0]
                wo={'range':num(w['attack_range']),'cd':round(num(w['cooldown_s']),4),'n':int(num(w['projectiles_per_activation'],1)),'spread':num(w['emission_angle_deg']),
                    'camo':w['attack_camo_filter']!='on' if False else None,
                    'speed':num(r['projectile_speed'],300),'life':num(r['lifespan_s'],1),'r':num(r['hit_radius'],2),'pierce':num(r['pierce'],1),'dmg':num(r['damage_per_hit']),'imm':imm(r['immune_properties'])}
                boom=[k for k in kids if k['projectile_id'] in ('Explosion',) or 'Explosion' in k['projectile_id']]
                if boom: k=boom[0]; wo['boom']={'r':num(k['hit_radius']),'pierce':num(k['pierce']),'dmg':num(k['damage_per_hit']),'imm':imm(k['immune_properties'])}
                for e in E:
                    if e['model_id']!=mid or not e['weapon_path']==w['weapon_path']: continue
                    if e['effect_type']=='DamageModifierForTagModel' and e['target_tag'] in ('Moabs','Ceramic'): wo.setdefault('bonus',{})[e['target_tag']]=num(e['added_damage'])
                    if e['effect_type']=='SlowModel':
                        pr=json.loads(e['parameters']); wo['slow']={'mult':pr.get('multiplier',.5),'t':pr.get('lifespan',num(e['lifespan_s'])),'layers':min(pr.get('layers',3),999)}
                    if e['effect_type']=='SlowModifierForTagModel' and e['target_tag']=='Moabs':
                        pr=json.loads(e['parameters']); wo['slowBoss']=pr.get('slowMultiplier',1.0)
                    if e['effect_type']=='DamageOverTimeModel':
                        pr=json.loads(e['parameters']); wo['dot']={'dmg':pr.get('damage',1),'every':pr.get('interval',1)}
                st['weapons'].append(wo)
            T['stats'][f'{a}{b}']=st
    out[our]=T
json.dump(out,open('/home/claude/gen/towers.json','w'))
for k,v in out.items():
    print(k, v['family'], v['paths'])
    for ab in ('00','10','20','30','01','02','03','31','13'):
        s=v['stats'].get(ab); print('  ',ab, json.dumps(s)[:300])
