#!/usr/bin/env python3
"""Read the normal public GitHub checks page; retain only SHA-bound sanitized check evidence."""
import argparse,datetime,hashlib,html,json,re,urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('sha');p.add_argument('output');a=p.parse_args();assert re.fullmatch('[a-f0-9]{40}',a.sha)
url='https://github.com/dhinetrya-jpg/mymomentoclock/pull/21/checks'
with urllib.request.urlopen(url,timeout=30) as r:
 assert r.status==200 and r.geturl()==url
 raw=r.read(3*1024*1024);s=raw.decode()
heads=[]
def walk(v):
 if isinstance(v,dict):
  for k,item in v.items():
   if k=='headSha':heads.append(item)
   walk(item)
 elif isinstance(v,list):
  for item in v:walk(item)
for m in re.finditer(r'<script\b[^>]*type="application/json"[^>]*>(.*?)</script>',s,re.S):
 try:walk(json.loads(m.group(1)))
 except json.JSONDecodeError:pass
assert set(heads)=={a.sha},f'Page head is {set(heads)}, requested {a.sha}; no stale CI acceptance'
links=list(re.finditer(r'<a href="(/dhinetrya-jpg/mymomentoclock/actions/runs/\d+)"[^>]*>',s));checks=[]
for i,m in enumerate(links):
 section=s[m.end():links[i+1].start() if i+1<len(links) else s.find('</main>',m.end())]
 name=re.search(r'<span>(.*?)</span>',section,re.S)
 statuses=re.findall(r'aria-label="(This job [^"]+)"',section)
 if not statuses:statuses=re.findall(r'aria-label="([^"]*(?:pending|progress|queued|failed|succeeded)[^"]*)"',section,re.I)
 run_url='https://github.com'+m.group(1)
 with urllib.request.urlopen(run_url,timeout=30) as response:
  assert response.status==200
  run_page=response.read(3*1024*1024).decode()
 title=html.unescape(re.search(r'<title>(.*?)</title>',run_page,re.S).group(1))
 assert '@'+a.sha[:7] in title,f'Run is not bound to requested head: {run_url} {title}'
 checks.append(dict(run_title=title,run_page_sha256=hashlib.sha256(run_page.encode()).hexdigest(),workflow=html.unescape(name.group(1)).strip() if name else 'UNKNOWN',url='https://github.com'+m.group(1),job_labels=statuses,conclusion='SUCCESS' if statuses and all(t=='This job succeeded' for t in statuses) else 'NOT_ALL_SUCCESS'))
result=dict(schema_version=1,observed_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),url=url,http_status=200,page_sha256=hashlib.sha256(raw).hexdigest(),head_sha=a.sha,checks=checks,scope='Observed GitHub PR checks HTML for exact head, not inferred from local tests. No session/channel data retained.',all_workflows_success=len(checks)==4 and all(r['conclusion']=='SUCCESS' for r in checks))
Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
