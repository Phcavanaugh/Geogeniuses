import csv, json
D='/tmp/btd/'
W=list(csv.DictReader(open(D+'combat/weapons.csv',encoding='utf-8-sig')))
P=list(csv.DictReader(open(D+'combat/projectiles.csv',encoding='utf-8-sig')))
E=list(csv.DictReader(open(D+'combat/effects.csv',encoding='utf-8-sig')))
U=list(csv.DictReader(open(D+'combat/upgrade_prices.csv',encoding='utf-8-sig')))
F={r['model_id']:r for r in csv.DictReader(open(D+'economy/farms.csv',encoding='utf-8-sig'))}
BUILD={r['model_id']:r for r in csv.DictReader(open(D+'combat/tower_and_hero_builds.csv',encoding='utf-8-sig'))}
num=lambda x,d=0: float(x) if x not in ('',None) else d
IMM={'Lead':'lead','Black':'black','Purple':'purple','White':'white','Frozen':'frozen'}
def imm(s): return [IMM[x.strip()] for x in s.split('|') if x.strip() in IMM]
# our tower -> (Bloons family, which Bloons path is our A, which is our B)
MAP={'gato':('DartMonkey',2,1),'abeja':('TackShooter',3,1),'pulpo':('GlueGunner',3,1),'dragon':('BombShooter',1,2),'huerto':('BananaFarm',1,2),'buho':('NinjaMonkey',1,2),
     'pinguino':('IceMonkey',2,1),'mago':('WizardMonkey',1,3),'nido':('MonkeyVillage',1,2)}
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
            rng=num(BUILD[mid]['tower_range']) if mid in BUILD else None
            if fam=='MonkeyVillage':
                st={'weapons':[],'support':{'range':rng,'rangeMult':0,'rate':1,'primary':None,'camo':False,'allTypes':False,'noGrow':b>=1}}
                for e in E:
                    if e['model_id']!=mid: continue
                    pr=json.loads(e['parameters']) if e['parameters'] else {}
                    t_=e['effect_type']
                    if t_=='RangeSupportModel' and 'PrimaryTraining' not in pr.get('mutatorId',''): st['support']['rangeMult']=pr['multiplier']
                    if t_=='RateSupportModel': st['support']['rate']=pr['multiplier']
                    if t_ in ('PierceSupportModel','ProjectileSpeedSupportModel') or (t_=='RangeSupportModel' and 'PrimaryTraining' in pr.get('mutatorId','')):
                        P_=st['support']['primary'] or {}; P_[{'PierceSupportModel':'pierce','ProjectileSpeedSupportModel':'speed','RangeSupportModel':'range'}[t_]]=pr.get('pierce',pr.get('multiplier')); st['support']['primary']=P_
                    if t_=='VisibilitySupportModel': st['support']['camo']=True
                    if t_=='DamageTypeSupportModel': st['support']['allTypes']=True
                T['stats'][f'{a}{b}']=st; continue
            ws=[w for w in W if w['model_id']==mid and w['scope']=='placed tower']
            if not ws: print('no weapon',mid); continue
            st={'weapons':[]}
            for w in ws:
                ps=[p for p in P if p['model_id']==mid and p['weapon_path']==w['weapon_path']]
                root=[p for p in ps if not p['parent_projectile_path']]
                kids=[p for p in ps if p['parent_projectile_path']]
                r=root[0]
                wo={'range':num(w['attack_range']),'sees':w['attack_camo_filter']!='on','aura':not num(r['projectile_speed']) and num(r['hit_radius'])>=10,'cd':round(num(w['cooldown_s']),4),'n':int(num(w['projectiles_per_activation'],1)),'spread':num(w['emission_angle_deg']),
                    'camo':w['attack_camo_filter']!='on' if False else None,
                    'speed':num(r['projectile_speed'],300),'life':num(r['lifespan_s'],1),'r':num(r['hit_radius'],2),'pierce':num(r['pierce'],1),'dmg':num(r['damage_per_hit']),'imm':imm(r['immune_properties'])}
                boom=[k for k in kids if k['projectile_id'] in ('Explosion',) or 'Explosion' in k['projectile_id']]
                sh_=[k for k in kids if k['projectile_id']=='Shard']
                if sh_: k=sh_[0]; wo['shards']={'n':3,'pierce':num(k['pierce']),'dmg':num(k['damage_per_hit']),'r':num(k['hit_radius']),'imm':imm(k['immune_properties'])}
                if boom: k=boom[0]; wo['boom']={'r':num(k['hit_radius']),'pierce':num(k['pierce']),'dmg':num(k['damage_per_hit']),'imm':imm(k['immune_properties'])}
                for e in E:
                    if e['model_id']!=mid or not e['weapon_path']==w['weapon_path']: continue
                    if e['effect_type']=='DamageModifierForTagModel' and e['target_tag'] in ('Moabs','Ceramic'): wo.setdefault('bonus',{})[e['target_tag']]=num(e['added_damage'])
                    if e['effect_type']=='SlowModel':
                        pr=json.loads(e['parameters']); wo['slow']={'mult':pr.get('multiplier',.5),'t':pr.get('lifespan',num(e['lifespan_s'])),'layers':min(pr.get('layers',3),999)}
                    if e['effect_type']=='SlowModifierForTagModel' and e['target_tag']=='Moabs':
                        pr=json.loads(e['parameters']); wo['slowBoss']=pr.get('slowMultiplier',1.0)
                    if e['effect_type']=='DamageModifierForTagModel' and e['target_tag']=='Camo':
                        pr=json.loads(e['parameters']);
                        if pr.get('damageAddative'): wo.setdefault('bonus',{})['Camo']=pr['damageAddative']
                    if e['effect_type']=='FreezeModel':
                        pr=json.loads(e['parameters']); wo['freeze']={'t':pr['lifespan'],'layers':pr['layers'],'boss':pr.get('canFreezeMoabs',False)}
                    if e['effect_type']=='TrackTargetModel': wo['seek']=True
                    if e['effect_type']=='WindModel':
                        pr=json.loads(e['parameters']); wo['wind']={'chance':pr['chance'],'min':pr['distanceMin'],'max':pr['distanceMax'],'moab':pr.get('affectMoab',False)}
                    if e['effect_type']=='RemoveBloonModifiersModel':
                        pr=json.loads(e['parameters'])
                        if pr.get('cleanseCamo'): wo['decamo']=True
                    if e['effect_type']=='DamageOverTimeModel':
                        pr=json.loads(e['parameters']); wo['dot']={'dmg':pr.get('damage',1),'every':pr.get('interval',1)}
                st['weapons'].append(wo)
            # the Wizard's Shimmer: a second attack that only takes hiding away from everything in range
            if fam=='WizardMonkey' and len(st['weapons'])>1:
                for wo in st['weapons'][1:]: wo.update({'aura':True,'decamo':True,'dmg':0,'r':wo['range']})
            # tower-wide: sees hidden critters (all ninja models), Shinobi Tactics (buffs ninjas in range)
            if fam=='NinjaMonkey': st['camo']=True
            if any(w.get('sees') for w in st['weapons']) and fam!='DartMonkey' or fam=='NinjaMonkey': st['camo']=True
            for e in E:
                if e['model_id']==mid and e['effect_type']=='SupportShinobiTacticsModel': st['shinobi']=json.loads(e['parameters'])['multiplier']
            T['stats'][f'{a}{b}']=st
    out[our]=T
json.dump(out,open('/tmp/btd-towers.json','w'))
for k,v in out.items():
    print(k, v['family'], v['paths'])
    for ab in ('00','10','20','30','01','02','03','31','13'):
        s=v['stats'].get(ab); print('  ',ab, json.dumps(s)[:300])
