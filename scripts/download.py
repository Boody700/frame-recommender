"""Download the small development dataset with its original redistribution terms."""
from pathlib import Path
import urllib.request,zipfile,io,json,hashlib,argparse
ROOT=Path(__file__).resolve().parents[1]
URL='https://files.grouplens.org/datasets/movielens/ml-latest-small.zip'
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--archive',type=Path);args=parser.parse_args()
    if args.archive:blob=args.archive.read_bytes()
    else:
        with urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'FrameResearchPortfolio/1.0'}),timeout=90) as response:blob=response.read()
    out=ROOT/'data';out.mkdir(exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        for name in ['ratings.csv','movies.csv','README.txt']:
            (out/name).write_bytes(archive.read('ml-latest-small/'+name))
    manifest={'source':'https://grouplens.org/datasets/movielens/latest/','download':URL,'archiveSha256':hashlib.sha256(blob).hexdigest(),'dataset':'ml-latest-small / generated 2018-09-26','terms':'Original GroupLens research/noncommercial conditions; redistribution under the same terms. See data/README.txt.','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.name!='manifest.json'}}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print('Saved ratings, metadata and original GroupLens terms.')
if __name__=='__main__':main()
