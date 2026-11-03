"""Independent transcription/calculation check against retained primary-source HTML."""
import json, re, hashlib, subprocess
from pathlib import Path
from html.parser import HTMLParser
from decimal import Decimal, ROUND_HALF_UP

root=Path(__file__).parent
class Tables(HTMLParser):
    def __init__(self): super().__init__(); self.rows=[]; self.row=None; self.cell=None
    def handle_starttag(self,t,a):
        if t=='tr': self.row=[]
        if t in ('th','td') and self.row is not None: self.cell=[]
    def handle_data(self,s):
        if self.cell is not None: self.cell.append(s)
    def handle_endtag(self,t):
        if t in ('th','td') and self.cell is not None:
            self.row.append(re.sub(r'\s+',' ',''.join(self.cell)).strip()); self.cell=None
        if t=='tr' and self.row is not None: self.rows.append(self.row); self.row=None
p=Tables();p.feed((root/'sources/abs-regional-2023-24.html').read_text(encoding='utf-8'))
lesson=json.loads((root/'lesson.json').read_text(encoding='utf-8'))
transcribed=json.loads((root/'sources/city-data.json').read_text(encoding='utf-8'))
checks=[]; calculations=[]
def check(ok,label):
    assert ok,label
    checks.append(label)
def num(v): return Decimal(v.replace(',','').replace('%',''))
official={}
for item in transcribed['cities']:
    candidates=[r for r in p.rows if len(r)==4 and r[0]==item['city'] and num(r[1])>1_000_000]
    check(len(candidates)==1,'Unique official population/change/rate row for '+item['city'])
    r=candidates[0]; official[item['city']]=[num(x) for x in r[1:]]
    for i,k in enumerate(['population','increase','rate']):
        check(Decimal(str(item[k]))==official[item['city']][i],'Direct source transcription '+item['city']+' '+k)
    population,change,rate=official[item['city']]; prior=population-change
    calc=(change/prior*100).quantize(Decimal('.1'),rounding=ROUND_HALF_UP)
    check(calc==rate,'Independent growth-rate calculation '+item['city'])
    calculations.append({'city':item['city'],'population':str(population),'change':str(change),'prior':str(prior),'calculatedRate':str(calc),'publishedRate':str(rate)})
check(official['Sydney'][0]-official['Brisbane'][0]==2777170,'Sydney/Brisbane count difference 2,777,170')
check(official['Sydney'][1]-official['Brisbane'][1]==34608,'Sydney/Brisbane added-resident difference 34,608')
check(Decimal(40)*Decimal('1.2')==48 and Decimal(60)*Decimal('1.2')==72,'Illustrative equal-growth counts independently correct')
check(Decimal(48)/Decimal(120)*100==40,'Illustrative share remains 40%')
check(official['Melbourne'][1]>official['Perth'][1] and official['Melbourne'][2]<official['Perth'][2],'Worked comparison distinguishes count from relative growth')
qs=[q for s in lesson['slides'] for a in s['activities'] for q in a.get('questions',[])]
check(len(qs)==6 and len({q['id'] for q in qs})==6,'Six stable unique task IDs')
check(sum(len(q['parts']) for q in qs)==21,'Twenty-one authored reasoning/calculation subparts')
check(all(q.get('answer') and q.get('workedAnswer') for q in qs),'Every task has a substantive teacher answer and reasoning model')
check(lesson['meta']['responseMode']=='paper','Explicit paper response delivery')
check(lesson['meta']['answerPolicy']['final']=='hidden' and lesson['meta']['answerPolicy']['worked']=='hidden','Candidate teacher-withheld policy')
check(lesson['meta']['curriculumMappings']==[],'No unsupported formal curriculum alignment asserted')
check(len(lesson['slides'])==5 and sum(len(s['activities']) for s in lesson['slides'])==10,'Complete five-stage ten-activity journey')
for s in lesson['slides']:
    definitions={v['id'] for v in s.get('visuals',[])}
    for a in s['activities']:
        if a.get('layout')=='geography-notes': check(2<=len(a['keyNotes'])<=3,a['id']+' has two or three essential notes')
        for q in a.get('questions',[]): check(set(q.get('visualRefs',[]))<=definitions,q['id']+' source references resolve in its owning skill')
style=json.loads((root/'sources/abs-map-style.json').read_text(encoding='utf-8'))
bins=style['layerDefinition']['drawingInfo']['renderer']['classBreakInfos']
check([b['classMaxValue'] for b in bins[:5]]==[.001,500,2000,5000,8000],'Legend thresholds verified independently from official ABS-owned renderer')
metadata=(root/'sources/abs-grid/JPEG/apg24r_1_0_0_19115-3_metadata.xml').read_text(encoding='utf-8')
check('CC BY 4.0' in metadata and '3577' in metadata,'Specific downloaded grid metadata confirms licence and coordinate system')
independent=next(q for q in qs if q['id']=='y9-01-independent')
words=len(independent['workedAnswer'].split());check(100<=words<=140,'Preserved optional extension model meets its 100–140-word brief')
refinement=json.loads((root/'refinement-content.json').read_text(encoding='utf-8'))
core_words=len(refinement['core']['model'].split());check(60<=core_words<=90,'Separate core teacher model meets 60–90-word expectation')
check(sum(refinement['timingMinutes'].values())==60,'Complete revised activity budget remains 60 minutes')
check(sum(refinement['core'][k] for k in ['planningMinutes','writingMinutes','checkingMinutes'])==8,'Independent core planning/writing/checking totals eight minutes')
check('60–90' in next(a for s in lesson['slides'] for a in s['activities'] if a['id']=='independent')['practiceNote'],'Actual learner task states revised core writing expectation')
check('activities' not in lesson['meta']['frontMatter'][0]['title'],'Learner inquiry narrowed to population evidence')
before=json.loads(subprocess.check_output(['git','show',refinement['previousHead']+':docs/review/geography-y9-01/lesson.json'],cwd=root.parent.parent.parent).decode('utf-8'))
oldqs=[q for s in before['slides'] for a in s['activities'] for q in a.get('questions',[])]
check([q['id'] for q in qs]==[q['id'] for q in oldqs],'All six original question IDs retained in order')
for a,b in zip(qs,oldqs): check(a['workedAnswer']==b['workedAnswer'],a['id']+' original teacher reasoning/model preserved verbatim')
check([s['id'] for s in lesson['slides']]==[s['id'] for s in before['slides']],'Five original stage IDs retained')
for newskill,oldskill in zip(lesson['slides'],before['slides']):
    check([a['id'] for a in newskill['activities']]==[a['id'] for a in oldskill['activities']],newskill['id']+' activity IDs/order retained')
    for v in newskill.get('visuals',[]):
        old=next(x for x in oldskill['visuals'] if x['id']==v['id'])
        if v['kind']=='image':
            check(all(v.get(k)==old.get(k) for k in ['src','alt','sourceMetadata']),newskill['id']+' original map bytes/alternative/provenance/rights preserved')
        else: check(v==old,newskill['id']+' complete original statistical table preserved')
new_ex=lesson['slides'][1]['activities'][1]['workedExamples'][0]['examples'][0]
old_ex=before['slides'][1]['activities'][1]['workedExamples'][0]['examples'][0]
check(new_ex['steps']==old_ex['steps'] and new_ex['visual']==old_ex['visual'],'Complete worked comparison and embedded table retained')
check(new_ex.get('visualPlacement')=='question' and 'questionComposition' not in new_ex,'Only supported existing placement changes the worked-table composition')
report={'complete':True,'checks':checks,'calculations':calculations,'independentModelWords':words,'coreModelWords':core_words,'plannedMinutes':60,'method':'Separate Python HTML-parser extraction from retained official ABS table, Decimal calculations, and comparison with accepted v3 content. Manual visual map review and prose/pedagogical review are separate, not replaced by these assertions.','sourceSha256':hashlib.sha256((root/'sources/abs-regional-2023-24.html').read_bytes()).hexdigest()}
(root/'content-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'checks':len(checks),'coreWords':core_words,'extensionWords':words,'complete':True}))
