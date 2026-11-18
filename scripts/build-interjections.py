"""Build short vowel interjections from the user's selected original voice fragments.

Requires numpy only at build time. This performs signal editing/resynthesis,
not training a voice model. Original input WAV files are preserved.
"""
import pathlib,wave,json,math
import numpy as np

BASE=pathlib.Path(__file__).resolve().parent.parent
DEST=BASE/'assets/sounds/interjections';DEST.mkdir(exist_ok=True)
RATE=22050
SEEDS={
 'hachiware':{'ah':('hachiware-v2-1.wav',1),'oh':('hachiware-v2-4.wav',4)},
 'chiikawa':{'ah':('chiikawa-v2-1.wav',1),'oh':('chiikawa-v2-2.wav',2)}
}

def read(filename):
 with wave.open(str(BASE/'assets/sounds/candidates'/filename)) as w:
  if w.getnchannels()!=1 or w.getframerate()!=RATE or w.getsampwidth()!=2:
   raise ValueError('Expected mono 22050Hz PCM16 input')
  return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768

def select_voiced(x):
 """Find a periodic voiced nucleus; avoid consonant onsets and quiet edges."""
 length=min(int(RATE*.16),len(x));best=None
 for start in range(0,max(1,len(x)-length+1),int(RATE*.01)):
  frame=x[start:start+length].copy();frame-=frame.mean()
  rms=float(np.sqrt(np.mean(frame*frame)))
  if rms<.004:continue
  weighted=frame*np.hanning(len(frame));corr=np.correlate(weighted,weighted,'full')[len(frame)-1:]
  lo=int(RATE/950);hi=min(int(RATE/150),len(corr)-1)
  periodicity=float(np.max(corr[lo:hi])/max(corr[0],1e-10))
  score=periodicity*(min(.3,rms)**.35)
  if best is None or score>best[0]:best=(score,start,frame)
 if best is None:raise ValueError('No usable vocal nucleus')
 return best[2],best[1]/RATE

def vowel_edit(x,vowel):
 """Keep original harmonic excitation; reshape the vocal spectral envelope."""
 x=x-x.mean();pre=x.copy();pre[1:]=x[1:]-.85*x[:-1]
 win=pre*np.hanning(len(pre));order=16
 r=np.array([np.dot(win[:len(win)-k],win[k:]) for k in range(order+1)])
 r[0]*=1.015
 matrix=np.array([[r[abs(i-j)] for j in range(order)] for i in range(order)])
 coefficients=np.linalg.solve(matrix,r[1:]);a=np.r_[1.,-coefficients]
 size=2**int(np.ceil(np.log2(len(x)*2)))
 frequency=np.fft.rfftfreq(size,1/RATE);omega=2*np.pi*frequency/RATE
 source_envelope=1/np.maximum(np.abs(np.exp(-1j*np.outer(omega,np.arange(len(a))))@a),.02)
 # Childlike vowel resonances; pitch and fine harmonic structure come from input.
 formants=[(950,190),(1650,240),(3000,360)] if vowel=='ah' else [(620,170),(1050,210),(2950,350)]
 target=np.ones_like(frequency)
 for center,bandwidth in formants:
  radius=np.exp(-np.pi*bandwidth/RATE)
  denominator=1-2*radius*np.cos(2*np.pi*center/RATE)*np.exp(-1j*omega)+radius**2*np.exp(-2j*omega)
  target/=np.maximum(np.abs(denominator),.02)
 target/=max(float(np.max(target)),1e-9);source_envelope/=max(float(np.max(source_envelope)),1e-9)
 ratio=np.clip(target/np.maximum(source_envelope,.025),.08,9.)**.78
 ratio*=np.minimum(1,frequency/90)
 ratio*=np.exp(-np.maximum(0,frequency-4800)/1800)
 edited=np.fft.irfft(np.fft.rfft(x,size)*ratio,size)[:len(x)]
 return edited/max(np.max(np.abs(edited)),1e-8)

def stretch_continuous(x,duration):
 """Lengthen one voiced nucleus with phase continuity, never by looping it."""
 count=int(RATE*duration);nfft=1024;hop=128;window=np.hanning(nfft)
 padded=np.pad(x,(nfft//2,nfft//2),mode='reflect')
 frames=np.lib.stride_tricks.sliding_window_view(padded,nfft)[::hop]
 spectrum=np.fft.rfft(frames*window,axis=1).T
 # Suppress the source's onset/syllable-level amplitude bumps before stretching.
 energy=np.sqrt(np.mean(np.abs(spectrum)**2,axis=0))
 spectrum*=np.clip(np.median(energy)/np.maximum(energy,1e-8),.4,2.)
 rate=len(x)/count;steps=np.arange(0,spectrum.shape[1]-1,rate)
 phase=np.angle(spectrum[:,0]);advance=2*np.pi*hop*np.arange(nfft//2+1)/nfft
 stretched=[]
 for step in steps:
  i=int(step);blend=step-i;left=spectrum[:,i];right=spectrum[:,i+1]
  magnitude=(1-blend)*np.abs(left)+blend*np.abs(right)
  stretched.append(magnitude*np.exp(1j*phase))
  delta=np.angle(right)-np.angle(left)-advance
  delta-=2*np.pi*np.round(delta/(2*np.pi));phase+=advance+delta
 out=np.zeros(len(stretched)*hop+nfft);normalizer=np.zeros_like(out)
 for i,column in enumerate(stretched):
  pos=i*hop;out[pos:pos+nfft]+=np.fft.irfft(column,nfft)*window
  normalizer[pos:pos+nfft]+=window*window
 out/=np.maximum(normalizer,1e-8)
 out=out[nfft//2:nfft//2+count]
 return np.pad(out,(0,max(0,count-len(out))))[:count]

def render(seed,vowel,duration,contour):
 x=vowel_edit(seed,vowel);x=stretch_continuous(x,duration*1.14)
 count=int(RATE*duration);t=np.linspace(0,1,count)
 # Gentle intonation through resampling of the edited original vowel.
 speed=1+contour*(t-.5);positions=np.cumsum(speed)-speed[0]
 x=np.interp(positions,np.arange(len(x)),x)
 attack=np.minimum(1,t/max(.025,.018/duration))
 release=np.minimum(1,(1-t)/max(.14,.07/duration))
 envelope=attack*np.maximum(0,release)**1.35*(1-.12*t)
 x*=envelope;x/=max(np.max(np.abs(x)),1e-8);x*=.68
 return x

def write(path,x):
 with wave.open(str(path),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
  w.writeframes(np.clip(x*32767,-32768,32767).astype('<i2').tobytes())

patterns=[('ah','아!',.32,-.10),('oh','오!',.34,-.08),('ah-long','아~',.56,-.045),('oh-question','오?',.46,.12)]
manifest=[]
for person,choices in SEEDS.items():
 for name,label,duration,contour in patterns:
  vowel='ah' if name.startswith('ah') else 'oh'
  filename,number=choices[vowel];seed,offset=select_voiced(read(filename))
  result=render(seed,vowel,duration,contour);target=DEST/f'{person}-{name}.wav';write(target,result)
  manifest.append({'person':person,'label':label,'file':str(target.relative_to(BASE)).replace('\\','/'),'source':f'assets/sounds/candidates/{filename}','selected_source_number':number,'nucleus_offset':round(offset,3),'duration':duration,'method':'Single original voiced nucleus; LPC vowel shaping; phase-continuous time stretch with no sample loops; single onset/release; intonation editing. No trained model.','sample_looping':False,'listening_verified':False})
(DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Built 8 vowel interjection edits from only the user-selected 4 reference clips.')
