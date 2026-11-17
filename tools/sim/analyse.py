import json, sys, collections as C, statistics as S
R=[json.loads(l) for l in open(sys.argv[1])]
print('errors',sum(1 for r in R if r['errors'] or r['pageErrors']))
for key in ['difficulty','strategy']:
    d=C.defaultdict(C.Counter)
    for r in R: d[r[key]][r['winner']]+=1
    for k,v in sorted(d.items()): print(f"  {k:9} player {v['player']:2}  ai {v['ai']:2}  timeout {v['timeout']:2}")
spent=C.Counter(); kv=C.Counter(); prod=C.Counter()
for r in R:
    for t in [0,1]:
        for k,v in r['spent'][t].items(): spent[k]+=v
        for k,v in r['produced'][t].items(): prod[k]+=v
    for k,v in r['killValue'].items(): kv[k]+=v
for k in ['soldier','grenadier','rocket','sniper','buggy','light','heavy']: print(f"  {k:9} made {prod[k]:5}  value ratio {kv[k]/spent[k]:.2f}" if spent[k] else k)
print('captures player/ai', sum(r['captures'][0] for r in R), sum(r['captures'][1] for r in R))
for dfc in ['easy','normal','hard']:
    rs=[r for r in R if r['difficulty']==dfc]; print(dfc, 'AI cash avg', round(S.mean([x for r in rs for x in r['idleCashSamples']] or [0])), 'waves', round(S.mean(r['aiWaves'] for r in rs),1), 'AI engineers', sum(r['produced'][1].get('engineer',0) for r in rs), 'AI rockets', sum(r['produced'][1].get('rocket',0) for r in rs))
