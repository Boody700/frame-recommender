import unittest,sys,json,hashlib
from pathlib import Path
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from train import split_ratings,rank,evaluate
class PipelineTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.r=json.loads((ROOT/'reports/evaluation.json').read_text(encoding='utf-8'));cls.m=json.loads((ROOT/'dist/data/model.json').read_text(encoding='utf-8'));cls.p=json.loads((ROOT/'reports/parity.json').read_text(encoding='utf-8'));cls.raw=pd.read_csv(ROOT/'data/ratings.csv');cls.parts=split_ratings(cls.raw)
 def test_source_shape_and_hashes(self):
  self.assertEqual(len(self.raw),100836);self.assertEqual(self.raw.userId.nunique(),610)
  for name,digest in self.r['hashes'].items():self.assertEqual(hashlib.sha256((ROOT/'data'/name).read_bytes()).hexdigest(),digest)
 def test_disjoint_per_user_order_and_complete_partition(self):
  keys=[set(zip(v.userId,v.movieId)) for v in self.parts.values()]
  self.assertFalse(keys[0]&keys[1]);self.assertFalse(keys[0]&keys[2]);self.assertFalse(keys[1]&keys[2]);self.assertEqual(sum(map(len,keys)),len(self.raw))
  for _,rows in self.raw.groupby('userId'):
   u=rows.userId.iloc[0];a=self.parts['train'].query('userId==@u');b=self.parts['validation'].query('userId==@u');c=self.parts['test'].query('userId==@u');self.assertLessEqual(a.timestamp.max(),b.timestamp.min());self.assertLessEqual(b.timestamp.max(),c.timestamp.min())
 def test_catalog_selection_uses_training_only(self):
  t=self.parts['train'];counts=t[t.rating>=4].groupby('movieId').size().reset_index(name='count').sort_values(['count','movieId'],ascending=[False,True]);self.assertEqual(sorted(counts.head(1000).movieId),self.m['ids'])
 def test_sparse_edges_and_normalized_genres(self):
  for i,row in enumerate(self.m['neighbors']):
   self.assertLessEqual(len(row),40);self.assertTrue(all(i!=j and 0<w<=1 for j,w in row));self.assertEqual(len(row),len({j for j,w in row}))
  g=np.array(self.m['genres']);np.testing.assert_allclose(np.linalg.norm(g,axis=1),1,atol=1e-12)
 def test_validation_selects_identity_without_test_scores(self):
  self.assertEqual(self.r['selected'],max(self.r['models'],key=lambda k:self.r['models'][k]['validation']['ndcg10']))
 def test_seen_exclusion_and_eligible_scope(self):
  self.assertEqual(len(self.p['cases']),self.r['testScope']['eligibleUsers'])
  for c in self.p['cases']:self.assertGreaterEqual(len(c['seeds']),5);self.assertTrue(c['relevant']);self.assertFalse(set(c['seen'])&set(c['relevant']))
 def test_metrics_reconcile_for_selected_ranker(self):
  result,_=evaluate(self.m,self.p['cases'],self.r['selected'])
  for k in ['ndcg10','recall10','hit10','catalogCoverage']:self.assertAlmostEqual(result[k],self.r['models'][self.r['selected']]['test'][k])
 def test_top_rank_and_paired_delta_are_consistent(self):
  c=self.p['cases'][0];top,_=rank(self.m,c['seeds'],c['seen'],self.r['selected']);self.assertEqual(top,self.p['results'][self.r['selected']][0]['top'])
  delta=np.mean([a['ndcg']-b['ndcg'] for a,b in zip(self.p['results'][self.r['selected']],self.p['results']['popular'])]);self.assertAlmostEqual(delta,self.r['deltaVsPopularity']['ndcg'])
if __name__=='__main__':unittest.main()
