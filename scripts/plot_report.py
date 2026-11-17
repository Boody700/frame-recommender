"""Optional diagnostic figure; does not add dependencies to the app or ranker."""
from pathlib import Path
import os,json
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'.cache/matplotlib'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
def main():
 r=json.loads((ROOT/'reports/evaluation.json').read_text(encoding='utf-8'));keys=list(r['models']);labels=['Popularity','Genre','Audience','Blend 25','Blend 50','Blend 75'];x=np.arange(6)
 plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
 fig,axes=plt.subplots(1,2,figsize=(12,5.5),facecolor='#fbf6f7',gridspec_kw={'width_ratios':[1.4,1],'wspace':.35})
 axes[0].bar(x-.18,[r['models'][k]['validation']['ndcg10'] for k in keys],width=.36,color='#c9a5b2',label='Validation');axes[0].bar(x+.18,[r['models'][k]['test']['ndcg10'] for k in keys],width=.36,color='#9e526e',label='Test');axes[0].set_xticks(x,labels,rotation=25,ha='right');axes[0].set(ylabel='Mean NDCG@10',title='Base rankers / full candidate catalog');axes[0].legend(frameon=False,fontsize=9);axes[0].grid(axis='y',alpha=.15)
 axes[1].barh(labels[::-1],[r['models'][k]['test']['catalogCoverage']*100 for k in keys[::-1]],color=['#9e526e' if k==r['selected'] else '#c9a5b2' for k in keys[::-1]]);axes[1].set(xlabel='Catalog exposure in all top-ten lists (%)',title='Relevance and exposure differ');axes[1].grid(axis='x',alpha=.15)
 fig.suptitle('FRAME / A fixed-download ranking diagnostic',x=.07,y=.98,ha='left',fontsize=17,fontweight='bold',color='#5d3443');fig.text(.07,.905,'491 / 610 eligible test users · 1,000 training-selected films · no sampled negatives',fontsize=10,color='#98687a');fig.subplots_adjust(left=.07,right=.97,top=.79,bottom=.28)
 fig.text(.07,.09,'Selected blend: test NDCG@10 0.0836; paired difference vs popularity +0.0208 [0.0075, 0.0339].\nKnown-user per-user split, not a global time replay. Only 2,489 / 4,634 test positives are in the catalog.\nSource: MovieLens latest-small / GroupLens, generated 2018-09-26; original research/noncommercial terms apply.',fontsize=9,color='#98687a')
 fig.savefig(ROOT/'reports/evaluation.png',dpi=150,facecolor=fig.get_facecolor());plt.close(fig)
if __name__=='__main__':main()
