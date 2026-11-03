"""Adapt the official ABS JPEG for a static teaching plate; never invent geometry/data."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent
Image.MAX_IMAGE_PIXELS = 230_000_000  # inspected official source: 19842 x 10822
im = Image.open(root / 'sources/abs-grid/JPEG/apg24e_1_0_0.jpg')
# Use JPEG's native reduced decode; preserve spatial aspect and source colours.
im.draft('RGB', (5000, 3000))
im = im.convert('RGB')
w, h = im.size
# Mainland and Tasmania only; remove distant-island margins, not regional evidence.
im = im.crop((int(w*.265), int(h*.02), int(w*.825), int(h*.99)))
im.thumbnail((1280, 1040), Image.Resampling.LANCZOS)
plate = Image.new('RGB', (1400, im.height + 300), 'white')
d = ImageDraw.Draw(plate)
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/arial.ttf', n)
d.text((45, 23), 'A  |  Australia: population distribution, June 2024', font=font(33), fill='#173849')
d.text((45, 69), 'Official ABS modelled 1 km² population grid · mainland and Tasmania', font=font(23), fill='#36565b')
plate.paste(im, ((1400-im.width)//2, 112))
# Region labels are orientation aids, not point locations or extra data.
for label, x, y in [('WA',.18,.50),('NT',.51,.26),('SA',.53,.58),('Qld',.75,.34),('NSW',.78,.67),('Vic',.74,.80),('Tas',.76,.94)]:
    px=(1400-im.width)//2+im.width*x; py=112+im.height*y
    box=d.textbbox((px,py),label,font=font(24))
    d.rectangle((box[0]-5,box[1]-3,box[2]+5,box[3]+3),fill='white')
    d.text((px,py),label,font=font(24),fill='#173849')
y=im.height+130
d.text((45,y),'People per km² (ABS classes; colours blend when reduced)',font=font(22),fill='#173849')
classes=[('#808080','Modelled zero'),('#ffffb3','Below 500'),('#fecd5b','500–<2,000'),('#fd8c3d','2,000–<5,000'),('#f13a1f','5,000–<8,000'),('#bd0024','8,000+')]
for i,(c,t) in enumerate(classes):
    x=45+(i%3)*440; yy=y+37+(i//3)*35
    d.rectangle((x,yy,x+26,yy+22),fill=c,outline='#556666')
    d.text((x+36,yy-2),t,font=font(21),fill='#173849')
d.text((45,y+113),'Source: ABS, Regional population 2023–24 (27 March 2025). © Commonwealth of Australia, CC BY 4.0.',font=font(19),fill='#36565b')
d.text((45,y+141),'Adaptation: crop, reduction, labels and legend. Not a household map; grey does not mean unoccupied Country.',font=font(19),fill='#36565b')
plate.save(root/'sources/population-map-2024.jpg',quality=94)
print(json.dumps({'sourceSize':[19842,10822],'plateSize':plate.size,'adaptation':'JPEG reduced decode, proportional crop to mainland/Tasmania, resampling, region labels and verified ABS density-class legend; no data recolouring or invented geometry'}))
