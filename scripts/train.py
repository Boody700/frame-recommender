"""Known-user ranking diagnostics, sparse item neighbors and portable scoring."""
from pathlib import Path
import os,json,hashlib,platform
os.environ.setdefault('OMP_NUM_THREADS','2')
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
NAMES={'popular':'Crowd favorites','content':'Genre affinity','collab':'Similar audiences','blend25':'Blend / 25% audience','blend50':'Blend / 50% audience','blend75':'Blend / 75% audience'}

def split_ratings(ratings):
    parts={'train':[],'validation':[],'test':[]}
    for _,rows in ratings.groupby('userId',sort=True):
        rows=rows.sort_values(['timestamp','movieId'],kind='stable');hold=max(1,int(np.floor(len(rows)*.1)))
        parts['train'].append(rows.iloc[:-2*hold]);parts['validation'].append(rows.iloc[-2*hold:-hold]);parts['test'].append(rows.iloc[-hold:])
    return {k:pd.concat(v).reset_index(drop=True) for k,v in parts.items()}

def normalize(x):
    m=float(np.max(x));return x/m if m>0 else np.zeros_like(x)

def build(rows,ids,genres):
    ix={int(mid):i for i,mid in enumerate(ids)};users=sorted(rows.userId.unique());ui={u:i for i,u in enumerate(users)};likes=rows[(rows.rating>=4)&rows.movieId.isin(ids)]
    matrix=np.zeros((len(users),len(ids)),dtype=float)
    for row in likes.itertuples():matrix[ui[row.userId],ix[row.movieId]]=1
    counts=matrix.sum(0);co=matrix.T@matrix;den=np.sqrt(counts[:,None]*counts[None,:]);sim=np.divide(co,den,out=np.zeros_like(co),where=den>0)*co/(co+10);np.fill_diagonal(sim,0)
    neighbors=[]
    for row in sim:
        order=sorted(np.flatnonzero(row>0),key=lambda j:(-np.floor(row[j]*1e12+.5)/1e12,int(ids[j])))[:40]
        neighbors.append([[int(j),float(row[j])] for j in order])
    return {'ids':list(map(int,ids)),'genres':genres.tolist(),'popularity':counts.tolist(),'neighbors':neighbors}

def score(model,seeds,name):
    n=len(model['ids']);pop=normalize(np.array(model['popularity']));seeds=sorted(set(seeds));aud=np.zeros(n)
    if not seeds:return pop
    for i in seeds:
        for j,v in model['neighbors'][i]:aud[j]+=v
    aud=normalize(aud);g=np.array(model['genres']);profile=g[seeds].sum(0);length=np.linalg.norm(profile);content=g@(profile/length) if length>0 else np.zeros(n);content=normalize(content)
    if name=='popular':return pop
    if name=='content':return content
    if name=='collab':return aud
    alpha={'blend25':.25,'blend50':.5,'blend75':.75}[name]
    return alpha*aud+(.95-alpha)*content+.05*pop

def rank(model,seeds,seen,name,k=10):
    scores=score(model,seeds,name);seen=set(seen)
    return sorted((i for i in range(len(scores)) if i not in seen),key=lambda j:(-np.floor(scores[j]*1e12+.5)/1e12,model['ids'][j]))[:k],scores

def user_cases(history,future,ids):
    ix={int(mid):i for i,mid in enumerate(ids)};cases=[];positives=future[future.rating>=4];eligible_events=0
    for u,rows in history.groupby('userId',sort=True):
        seeds=sorted({ix[int(m)] for m in rows.loc[(rows.rating>=4)&rows.movieId.isin(ids),'movieId']});seen=sorted({ix[int(m)] for m in rows.loc[rows.movieId.isin(ids),'movieId']});relevant=sorted({ix[int(m)] for m in positives.loc[(positives.userId==u)&positives.movieId.isin(ids),'movieId']})
        if len(seeds)>=5 and relevant:
            cases.append({'user':int(u),'seeds':seeds,'seen':seen,'relevant':relevant});eligible_events+=len(relevant)
    return cases,{'eligibleUsers':len(cases),'allUsers':int(future.userId.nunique()),'positiveEvents':len(positives),'inCatalogPositiveEvents':int(positives.movieId.isin(ids).sum()),'evaluatedPositiveEvents':eligible_events}

def evaluate(model,cases,name):
    rows=[];catalog=set()
    for case in cases:
        top,s=rank(model,case['seeds'],case['seen'],name);relevant=set(case['relevant']);hits=np.array([int(i in relevant) for i in top]);dcg=float(np.sum(hits/np.log2(np.arange(len(hits))+2)));ideal=float(np.sum(1/np.log2(np.arange(min(10,len(relevant)))+2)))
        rows.append({'user':case['user'],'ndcg':dcg/ideal,'recall':float(hits.sum()/len(relevant)),'precision':float(hits.sum()/10),'hit':int(hits.any()),'top':top,'scores':[float(s[i]) for i in top]});catalog.update(top)
    return {'ndcg10':float(np.mean([x['ndcg'] for x in rows])),'recall10':float(np.mean([x['recall'] for x in rows])),'precision10':float(np.mean([x['precision'] for x in rows])),'hit10':float(np.mean([x['hit'] for x in rows])),'catalogCoverage':len(catalog)/len(model['ids']),'users':len(rows)},rows

def main():
    ratings=pd.read_csv(ROOT/'data/ratings.csv');movies=pd.read_csv(ROOT/'data/movies.csv')
    if len(ratings)!=100836 or ratings.userId.nunique()!=610 or len(movies)!=9742:raise ValueError('Source version changed; review the split before rerunning')
    parts=split_ratings(ratings);training=parts['train']
    counts=training[training.rating>=4].groupby('movieId').size().reset_index(name='count').sort_values(['count','movieId'],ascending=[False,True])
    ids=np.array(sorted(counts.head(1000).movieId));catalog=movies.set_index('movieId').loc[ids].reset_index();vocab=sorted({g for text in catalog.genres for g in text.split('|') if g!='(no genres listed)'})
    binary=np.array([[int(g in text.split('|')) for g in vocab] for text in catalog.genres],dtype=float);idf=np.log((1+len(ids))/(1+binary.sum(0)))+1;genres=binary*idf;norm=np.linalg.norm(genres,axis=1);genres=np.divide(genres,norm[:,None],out=np.zeros_like(genres),where=norm[:,None]>0)
    val_model=build(training,ids,genres);val_cases,val_scope=user_cases(training,parts['validation'],ids);results={};val_rows={}
    for name in NAMES:
        print('Validation',name,flush=True);m,rr=evaluate(val_model,val_cases,name);results[name]={'label':NAMES[name],'validation':m};val_rows[name]=rr
    selected=max(NAMES,key=lambda k:results[k]['validation']['ndcg10'])
    history=pd.concat([training,parts['validation']],ignore_index=True);test_model=build(history,ids,genres);test_cases,test_scope=user_cases(history,parts['test'],ids);parity={}
    for name in NAMES:
        print('Test',name,flush=True);m,rr=evaluate(test_model,test_cases,name);results[name]['test']=m;parity[name]=rr
    # The browser uses this exact frozen train+validation model, keeping held-out test ratings out of the demo's fit.
    rng=np.random.default_rng(42);delta=np.array([a['ndcg']-b['ndcg'] for a,b in zip(parity[selected],parity['popular'])]);boot=np.array([rng.choice(delta,len(delta),replace=True).mean() for _ in range(2000)])
    report={'selected':selected,'names':NAMES,'models':results,'catalog':1000,'allMovies':9742,'ratings':100836,'users':610,'neighbors':40,'shrinkage':10,'positiveThreshold':4,'split':{**{k:len(v) for k,v in parts.items()},'policy':'Per-user timestamp order, then movieId for ties; final floor(10%) test, preceding floor(10%) validation, rest training. Known-user offline diagnostic, not a global historical replay. Other users may contribute ratings from later calendar dates.'},'validationScope':val_scope,'testScope':test_scope,'deltaVsPopularity':{'ndcg':float(delta.mean()),'bootstrap95':np.quantile(boot,[.025,.975]).tolist(),'resamples':2000,'unit':'eligible test user; paired resampling; exploratory conditional diagnostic'},'genres':vocab,'versions':{'python':platform.python_version(),'numpy':np.__version__,'pandas':pd.__version__},'hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'data/ratings.csv',ROOT/'data/movies.csv']}}
    catalog_rows=[]
    for i,row in catalog.iterrows():
        title=row.title;import re
        match=re.search(r'\((\d{4})\)\s*$',title);year=int(match.group(1)) if match else None;clean=re.sub(r'\s*\(\d{4}\)\s*$','',title)
        catalog_rows.append({'id':int(row.movieId),'title':clean,'year':year,'genres':row.genres.split('|'),'likes':int(test_model['popularity'][i]),'trainingLikes':int(val_model['popularity'][i])})
    out=ROOT/'dist/data';out.mkdir(parents=True,exist_ok=True);reports=ROOT/'reports';reports.mkdir(exist_ok=True)
    for name,obj in [('model',test_model),('catalog',catalog_rows),('evaluation',report)]: (out/(name+'.json')).write_text(json.dumps(obj,separators=(',',':'),allow_nan=False),encoding='utf-8')
    (reports/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8');(reports/'parity.json').write_text(json.dumps({'cases':test_cases,'results':parity},separators=(',',':')),encoding='utf-8')
    (reports/'validation-selection.json').write_text(json.dumps({'cases':val_cases,'results':val_rows},separators=(',',':')),encoding='utf-8')
    print(json.dumps({'selected':selected,'validation':results[selected]['validation'],'test':results[selected]['test'],'scope':test_scope,'delta':report['deltaVsPopularity']}),flush=True)
if __name__=='__main__':main()
