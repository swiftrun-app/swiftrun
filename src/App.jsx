import { useState, useEffect } from "react";

// ── BRAND ASSETS ──
import LOGO_ICON from "./logo.png";;
import LOGO_FULL from "./logo_full.png";;

// ── SCREENS ──
const S = { HOME:"home", MARKET:"market", CONCIERGE:"concierge", STORES:"stores", LEADERBOARD:"leaderboard", GIFT:"gift", FRANCHISE:"franchise", DIASPORA:"diaspora", SCORE:"score", ENTERPRISE:"enterprise", FEATURES:"features" };

// ── DATA ──
const ZONES = [
  { id:"cbd", name:"CBD / Main Mall", color:"#3B82F6" },
  { id:"gamecity", name:"Game City", color:"#12A4F3" },
  { id:"ext9", name:"Extension 9", color:"#10B981" },
  { id:"broadhurst", name:"Broadhurst", color:"#4FA8F0" },
  { id:"phakalane", name:"Phakalane", color:"#EC4899" },
];

const BOARD = {
  cbd:{ sponsor:{name:"Clicks Pharmacy CBD",logo:"💊",prize:"P450",vest:"Clicks branded vest",color:"#E4003A"}, endsIn:"2d 14h", theme:"Document & legal runs only", bonus:"+P15/run",
    runners:[{rank:1,name:"Portia S.",avatar:"🏃‍♀️",runs:94,score:4.98,earnings:"P4,870",badge:"👑",streak:18},{rank:2,name:"Lebo K.",avatar:"🏃",runs:87,score:4.95,earnings:"P4,480",badge:"🥈",streak:12},{rank:3,name:"Tshepo M.",avatar:"🏃",runs:81,score:4.91,earnings:"P4,110",badge:"🥉",streak:9},{rank:4,name:"Boitumelo R.",avatar:"🏃‍♀️",runs:74,score:4.88,earnings:"P3,750",badge:null,streak:7},{rank:5,name:"Bakang M.",avatar:"🏃",runs:61,score:4.90,earnings:"P3,100",badge:null,streak:11,isMe:true}]},
  gamecity:{ sponsor:{name:"Pick n Pay Game City",logo:"🛒",prize:"P380",vest:"Pick n Pay vest",color:"#0C7CF4"}, endsIn:"3d 6h", theme:"Grocery & shopping runs", bonus:"+P10/run",
    runners:[{rank:1,name:"Mpho T.",avatar:"🏃‍♀️",runs:112,score:4.97,earnings:"P5,820",badge:"👑",streak:24},{rank:2,name:"Kago S.",avatar:"🏃",runs:98,score:4.93,earnings:"P5,090",badge:"🥈",streak:15},{rank:3,name:"Ona R.",avatar:"🏃‍♀️",runs:91,score:4.89,earnings:"P4,730",badge:"🥉",streak:10},{rank:4,name:"Ditiro N.",avatar:"🏃",runs:83,score:4.85,earnings:"P4,300",badge:null,streak:8}]},
  ext9:{ sponsor:{name:"Spar Extension 9",logo:"🧃",prize:"P320",vest:"Spar branded vest",color:"#009B3A"}, endsIn:"1d 22h", theme:"All runs count", bonus:"+P8/run",
    runners:[{rank:1,name:"Bakang M.",avatar:"🏃",runs:43,score:4.90,earnings:"P2,240",badge:"👑",streak:11,isMe:true},{rank:2,name:"Dineo S.",avatar:"🏃‍♀️",runs:39,score:4.87,earnings:"P2,020",badge:"🥈",streak:7},{rank:3,name:"Tumelo B.",avatar:"🏃",runs:35,score:4.83,earnings:"P1,820",badge:"🥉",streak:5}]},
  broadhurst:{ sponsor:{name:"Broadhurst Pharmacy",logo:"💉",prize:"P280",vest:"Pharmacy vest",color:"#0D1D46"}, endsIn:"4d 10h", theme:"Medical & pharmacy runs", bonus:"+P20/pharmacy run",
    runners:[{rank:1,name:"Lethiwe K.",avatar:"🏃‍♀️",runs:67,score:4.96,earnings:"P3,480",badge:"👑",streak:20},{rank:2,name:"Pule M.",avatar:"🏃",runs:58,score:4.88,earnings:"P3,010",badge:"🥈",streak:13},{rank:3,name:"Kemi D.",avatar:"🏃‍♀️",runs:51,score:4.82,earnings:"P2,650",badge:"🥉",streak:8}]},
  phakalane:{ sponsor:{name:"Phakalane Golf Estate",logo:"⛳",prize:"P500",vest:"Premium vest",color:"#EC4899"}, endsIn:"5d 8h", theme:"Luxury & high-value runs", bonus:"+P25/run",
    runners:[{rank:1,name:"Nthabi R.",avatar:"🏃‍♀️",runs:29,score:4.99,earnings:"P2,030",badge:"👑",streak:16},{rank:2,name:"Otsile M.",avatar:"🏃",runs:25,score:4.94,earnings:"P1,750",badge:"🥈",streak:11},{rank:3,name:"Refilwe S.",avatar:"🏃‍♀️",runs:22,score:4.91,earnings:"P1,540",badge:"🥉",streak:8}]},
};

const SURGE = [
  {id:"cbd",name:"CBD",x:50,y:46,demand:94,runners:2,price:65,color:"#0C7CF4",label:"🔥 EXTREME"},
  {id:"gamecity",name:"Game City",x:34,y:66,demand:71,runners:5,price:52,color:"#12A4F3",label:"⚡ HIGH"},
  {id:"airport",name:"Airport Junction",x:62,y:10,demand:88,runners:1,price:87,color:"#0C7CF4",label:"🔥 EXTREME"},
  {id:"ext9",name:"Ext 9",x:60,y:30,demand:45,runners:8,price:38,color:"#10B981",label:"✓ NORMAL"},
  {id:"broadhurst",name:"Broadhurst",x:67,y:58,demand:62,runners:4,price:44,color:"#12A4F3",label:"⚡ HIGH"},
  {id:"phakalane",name:"Phakalane",x:72,y:12,demand:55,runners:6,price:70,color:"#10B981",label:"✓ NORMAL"},
  {id:"riverwalk",name:"Riverwalk",x:56,y:60,demand:79,runners:3,price:58,color:"#12A4F3",label:"⚡ HIGH"},
  {id:"mogoditshane",name:"Mogoditshane",x:16,y:28,demand:33,runners:9,price:30,color:"#3B82F6",label:"✓ LOW"},
];

const BIDS_INIT = [
  {id:"B1",errand:"Legal doc. CBD to Phakalane",base:65,current:112,bids:4,timeLeft:38,urgency:"ASAP"},
  {id:"B2",errand:"Pharmacy run. Airport Junction",base:87,current:143,bids:7,timeLeft:12,urgency:"EXPRESS"},
  {id:"B3",errand:"Grocery. Game City → Gaborone West",base:52,current:68,bids:2,timeLeft:55,urgency:"ASAP"},
  {id:"B4",errand:"Bank docs. Riverwalk to CBD",base:58,current:91,bids:5,timeLeft:29,urgency:"ASAP"},
];

const STORES = [
  {id:"s1",name:"Mama Thato's Kitchen",cat:"Food & Bakes",icon:"🍰",loc:"Extension 9",rating:4.8,deliveries:312,color:"#12A4F3",verified:true,items:[{n:"Vetkoek & Mince (6 pack)",p:42,e:"🫓"},{n:"Celebration Cake (1kg)",p:185,e:"🎂"},{n:"Lunch Plate",p:55,e:"🍱"}]},
  {id:"s2",name:"Kabo's Tailoring",cat:"Fashion & Alterations",icon:"🧵",loc:"African Mall",rating:4.9,deliveries:178,color:"#EC4899",verified:true,items:[{n:"Hem / Basic Alteration",p:35,e:"✂️"},{n:"Custom Dress",p:320,e:"👗"},{n:"School Uniform Alt.",p:48,e:"🎒"}]},
  {id:"s3",name:"TechFix Broadhurst",cat:"Electronics & Repair",icon:"📱",loc:"Broadhurst",rating:4.7,deliveries:94,color:"#06B6D4",verified:false,items:[{n:"Screen Protector",p:65,e:"📱"},{n:"Charging Cable",p:38,e:"🔌"},{n:"Repair Pickup & Return",p:80,e:"🔧"}]},
  {id:"s4",name:"Naledi Hardware",cat:"Hardware & Home",icon:"🔨",loc:"Gaborone West",rating:4.6,deliveries:201,color:"#10B981",verified:true,items:[{n:"Paint (5L)",p:145,e:"🎨"},{n:"Plumbing Kit",p:88,e:"🔧"},{n:"Hardware Bundle",p:60,e:"🛠️"}]},
];

const GIFT_TYPES = [
  {id:"grocery",icon:"🛒",title:"Weekly Groceries",desc:"Runner shops a list and delivers",price:"P120 to P350",popular:true},
  {id:"birthday",icon:"🎂",title:"Birthday Surprise",desc:"Cake, flowers, or a meal. You choose",price:"P80 to P250",popular:true},
  {id:"meds",icon:"💊",title:"Medication Run",desc:"Pharmacy prescription or chronic meds",price:"P65 to P140"},
  {id:"wellness",icon:"🌿",title:"Wellness Check",desc:"Runner checks in, reports back to you",price:"P90 to P180"},
  {id:"lunch",icon:"🍱",title:"Send a Meal",desc:"Food from their favourite local spot",price:"P60 to P150"},
  {id:"custom",icon:"✏️",title:"Custom",desc:"Describe anything. We'll figure it out",price:"Quote"},
];

const SENT_GIFTS = [
  {id:"G1",to:"Mama (Ext 9)",type:"Weekly Groceries",msg:"Happy Monday Mama ❤️",amount:280,status:"delivered",proof:true,reaction:"😭❤️ Thank you my child!"},
  {id:"G2",to:"Tshidi (Block 6)",type:"Birthday Surprise",msg:"Happy Birthday Tshidi!",amount:185,status:"en_route",eta:"Today 2:30pm"},
  {id:"G3",to:"Uncle Kabo (Mogoditshane)",type:"Medication Run",msg:"Your meds for the month",amount:140,status:"scheduled",eta:"Tomorrow 9am"},
];

const LOANS = [
  {id:"a",icon:"📱",name:"Airtime Credit",amount:"P50 to P500",rate:"0% interest",desc:"Instant advance, repaid from next 5 runs.",color:"#10B981",partner:"Orange Money / Mascom"},
  {id:"b",icon:"🛵",name:"Equipment Finance",amount:"P2k to P15k",rate:"8.5% p.a.",desc:"Phone, bike, or bag. Deducted weekly.",color:"#3B82F6",partner:"CEDA Microfinance"},
  {id:"c",icon:"🏪",name:"BizRun Loan",amount:"P5k to P50k",rate:"12% p.a.",desc:"Grow to multi-runner operation.",color:"#0D1D46",partner:"FNB Botswana"},
  {id:"d",icon:"🚨",name:"Emergency Float",amount:"Up to P1,000",rate:"0% interest",desc:"One-tap advance when you need it.",color:"#12A4F3",partner:"SwiftRun Trust Fund"},
];

const FEATURES_LIST = [
  {icon:"🛡️",title:"GhostID Vault",tag:"TRUST",desc:"National ID + face scan + liveness check on every login."},
  {icon:"📦",title:"SmartEscrow",tag:"PAYMENTS",desc:"Payment released only after delivery PIN is entered."},
  {icon:"💸",title:"RunPay + Mobile Money",tag:"PAYMENTS",desc:"Orange Money, MyZaka, Smega. All routed through escrow."},
  {icon:"📍",title:"LiveTrail GPS",tag:"TRACKING",desc:"Continuous breadcrumbing. Route deviation triggers alert."},
  {icon:"🤝",title:"Crowd Vouching",tag:"COMMUNITY",desc:"3 existing runners vouch for each new runner. Vouchers share liability."},
  {icon:"🎥",title:"PocketCam Proof",tag:"ACCOUNTABILITY",desc:"AI checks pickup & delivery photos for GPS match and timestamp."},
  {icon:"🧠",title:"TrustScore Engine",tag:"REPUTATION",desc:"Live score from completion rate, speed, and route integrity."},
  {icon:"📈",title:"Futures Market",tag:"MARKETPLACE",desc:"Senders bid up prices. Runners race to high-demand zones."},
  {icon:"🏦",title:"SwiftRun Score",tag:"FINANCE",desc:"TrustScore + earnings = verifiable credit identity for microloans."},
  {icon:"🤖",title:"AI Concierge",tag:"AI",desc:"Describe complex multi-stop errands in plain language. One tap to confirm."},
  {icon:"🏬",title:"Storefronts",tag:"MARKETPLACE",desc:"Local merchants sell directly. Runners deliver. Zero warehousing."},
  {icon:"👑",title:"Zone Captain",tag:"GROWTH",desc:"Lead 10 runners, earn 4% of every run they complete."},
  {icon:"✈️",title:"Diaspora Mode",tag:"REMITTANCE",desc:"Send errands to family in Gaborone from anywhere in the world."},
  {icon:"🏆",title:"Leaderboards",tag:"COMMUNITY",desc:"Weekly zone rankings. Sponsored prize + branded vest for #1."},
  {icon:"🎁",title:"Gift Errands",tag:"SOCIAL",desc:"Pre-pay an errand as a gift. Recipient tracks it live. Pure virality."},
  {icon:"🔔",title:"Panic Button",tag:"SAFETY",desc:"One tap alerts emergency contacts and SwiftRun Trust simultaneously."},
];

// ── STYLES ──
const C = {
  bg: "#070B14", card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)",
  muted: "rgba(255,255,255,0.4)", dim: "rgba(255,255,255,0.25)",
};
const btn = (active, color="#0C7CF4") => ({
  background: active ? `${color}18` : C.card,
  border: `1px solid ${active ? color+"55" : C.border}`,
  color: active ? "#fff" : C.muted,
  borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, transition: "all 0.15s",
});
const pill = (color) => ({ background:`${color}18`, border:`1px solid ${color}33`, color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 });
const card = (highlight, color="#fff") => ({ background: highlight ? `${color}0a` : C.card, border:`1px solid ${highlight ? color+"44" : C.border}`, borderRadius:16, padding:"20px 18px", transition:"all 0.2s" });

// ── SCREENS ──

function Leaderboard() {
  const [zone, setZone] = useState("ext9");
  const [tab, setTab] = useState("board");
  const [sponsorForm, setSponsorForm] = useState(false);
  const [applied, setApplied] = useState(false);
  const z = ZONES.find(z => z.id === zone);
  const d = BOARD[zone];
  const myEntry = d.runners.find(r => r.isMe);

  return (
    <div style={{padding:"56px 28px",maxWidth:860,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#12A4F3",letterSpacing:"0.12em",marginBottom:8}}>RUNNER LEADERBOARDS</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:24}}>
        <div>
          <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",margin:0}}>Run hard. Win the zone.</h2>
          <p style={{color:C.muted,marginTop:6,fontSize:14}}>Top runner each week wins a sponsored cash bonus + branded business vest. Local sponsors pay. Zero cost to SwiftRun.</p>
        </div>
        <button onClick={()=>setSponsorForm(true)} style={{...btn(false,"#12A4F3"),padding:"10px 18px",fontSize:13,fontWeight:700}}>🏢 Sponsor a zone →</button>
      </div>

      {/* Zone tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {ZONES.map(zn=>(
          <button key={zn.id} onClick={()=>setZone(zn.id)} style={btn(zone===zn.id,zn.color)}>{zn.name}</button>
        ))}
      </div>

      {/* View tabs */}
      <div style={{display:"flex",gap:6,marginBottom:24}}>
        {[["board","🏆 Rankings"],["sprint","⚡ Sprint"],["sponsor","🏢 Sponsor"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={btn(tab===id,"#12A4F3")}>{label}</button>
        ))}
      </div>

      {tab==="board" && (
        <div>
          {myEntry && (
            <div style={{background:"rgba(18,164,243,0.1)",border:"1px solid rgba(18,164,243,0.35)",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{fontSize:24}}>🏃</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700}}>Your position in {z.name}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{myEntry.rank===1?"🔥 You're leading! Keep going.":`Rank #${myEntry.rank} · ${d.runners[0].runs - myEntry.runs} runs behind ${d.runners[0].name}`}</div>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:"#12A4F3"}}>{myEntry.rank===1?"👑 Leading":`#${myEntry.rank}`}</div>
            </div>
          )}

          {/* Podium */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:12,marginBottom:24,flexWrap:"wrap"}}>
            {[2,1,3].map((rank,pi)=>{
              const r = d.runners.find(x=>x.rank===rank);
              if(!r) return null;
              const hs=[140,170,110];
              return (
                <div key={rank} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <div style={{fontSize:24}}>{r.badge}</div>
                  <div style={{fontSize:20}}>{r.avatar}</div>
                  <div style={{fontSize:12,fontWeight:700,color:r.isMe?"#12A4F3":"#fff"}}>{r.name}{r.isMe?" (you)":""}</div>
                  <div style={{fontSize:11,color:C.muted}}>{r.runs} runs</div>
                  <div style={{width:80,height:hs[pi],background:`${z.color}28`,border:`1px solid ${z.color}55`,borderRadius:"8px 8px 0 0",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:22,fontWeight:900,color:z.color}}>#{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full list */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {d.runners.map(r=>(
              <div key={r.rank} style={{display:"flex",alignItems:"center",gap:12,background:r.isMe?"rgba(18,164,243,0.07)":C.card,border:`1px solid ${r.isMe?"rgba(18,164,243,0.3)":C.border}`,borderRadius:12,padding:"13px 16px"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:r.badge?"rgba(18,164,243,0.2)":"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {r.badge?<span style={{fontSize:14}}>{r.badge}</span>:<span style={{fontSize:12,fontWeight:800,color:C.muted}}>#{r.rank}</span>}
                </div>
                <span style={{fontSize:18}}>{r.avatar}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:r.isMe?"#12A4F3":"#fff"}}>{r.name}{r.isMe?" · you":""}</div>
                  <div style={{fontSize:11,color:C.muted}}>🔥 {r.streak}-day streak · ⭐{r.score}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800}}>{r.runs} runs</div>
                  <div style={{fontSize:12,color:"#10B981",fontWeight:600}}>{r.earnings}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Prize strip */}
          <div style={{marginTop:20,background:`${d.sponsor.color}12`,border:`1px solid ${d.sponsor.color}44`,borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <span style={{fontSize:28}}>{d.sponsor.logo}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em",marginBottom:2}}>THIS WEEK: SPONSORED BY</div>
              <div style={{fontSize:14,fontWeight:800}}>{d.sponsor.name}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>{d.sponsor.vest} + <strong style={{color:"#12A4F3"}}>{d.sponsor.prize} cash bonus</strong></div>
            </div>
            <span style={{fontSize:28}}>🎽</span>
          </div>
        </div>
      )}

      {tab==="sprint" && (
        <div>
          <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:16,padding:"24px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#FCA5A5",letterSpacing:"0.1em",marginBottom:4}}>SPONSORED SPRINT · {z.name.toUpperCase()}</div>
                <div style={{fontSize:20,fontWeight:900}}>Theme: {d.theme}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:C.muted}}>ENDS IN</div>
                <div style={{fontSize:24,fontWeight:900,color:"#EF4444"}}>{d.endsIn}</div>
              </div>
            </div>
            <div style={{background:"rgba(18,164,243,0.1)",border:"1px solid rgba(18,164,243,0.3)",borderRadius:10,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:20}}>⚡</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#8FD0FA"}}>Sprint bonus: {d.bonus}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>Paid automatically to RunPay on top of normal delivery fee</div>
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            {[{icon:"🎽",title:"Vest = free ads",desc:"Runner wears sponsor's branded vest for 2 weeks. Sponsor gets a delivery reach report."},
              {icon:"💸",title:"Zero cost to SwiftRun",desc:"Sponsor pays the prize and vest print. SwiftRun charges P120 activation."},
              {icon:"📱",title:"Built-in virality",desc:"Runners share their rank on social. Sponsor gets organic reach every week."},
              {icon:"🏪",title:"Community bond",desc:"Links your business to the neighbourhood's top earners every week."}
            ].map(({icon,title,desc})=>(
              <div key={title} style={{...card(false),padding:"16px"}}>
                <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="sponsor" && !sponsorForm && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {[{tier:"Starter",price:"P480/wk",prize:"P200 prize",color:"#6B7280",items:["Standard vest","Zone sprint","Weekly report"]},
            {tier:"Popular",price:"P850/wk",prize:"P400 prize",color:"#12A4F3",highlight:true,items:["Premium vest","Themed sprint","Social story kit","Bi-weekly report"]},
            {tier:"Premium",price:"P1,400/wk",prize:"P650 prize",color:"#4FA8F0",items:["Custom vest design","Exclusive zone","Daily analytics","Runner interview video"]}
          ].map(({tier,price,prize,color,highlight,items})=>(
            <div key={tier} style={{...card(!!highlight,color),cursor:"pointer"}}>
              {highlight&&<div style={{fontSize:10,fontWeight:700,color,letterSpacing:"0.1em",marginBottom:6}}>MOST POPULAR</div>}
              <div style={{fontSize:17,fontWeight:900,marginBottom:2}}>{tier}</div>
              <div style={{fontSize:20,fontWeight:900,color,marginBottom:4}}>{price}</div>
              <div style={{...pill(color),display:"inline-block",marginBottom:12}}>{prize}</div>
              {items.map(i=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:4}}>· {i}</div>)}
              <button onClick={()=>setSponsorForm(true)} style={{marginTop:10,width:"100%",background:highlight?`linear-gradient(135deg,${color},#0C7CF4)`:"rgba(255,255,255,0.07)",border:highlight?"none":`1px solid ${C.border}`,color:"#fff",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,fontWeight:700}}>Apply →</button>
            </div>
          ))}
        </div>
      )}

      {sponsorForm && !applied && (
        <div style={{background:"rgba(18,164,243,0.07)",border:"1px solid rgba(18,164,243,0.25)",borderRadius:16,padding:"24px"}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:18}}>Sponsor application: {z.name}</div>
          {["Business name","Contact name","Phone / WhatsApp","Preferred sprint theme"].map(label=>(
            <div key={label} style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:C.muted,display:"block",marginBottom:5}}>{label}</label>
              <input placeholder={`Enter ${label.toLowerCase()}…`} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setSponsorForm(false)} style={{flex:1,...btn(false)}}>Cancel</button>
            <button onClick={()=>setApplied(true)} style={{flex:2,background:"linear-gradient(135deg,#12A4F3,#0C7CF4)",border:"none",color:"#fff",borderRadius:10,padding:"12px",cursor:"pointer",fontSize:14,fontWeight:700}}>Submit →</button>
          </div>
        </div>
      )}
      {applied && <div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🎽✅</div><div style={{fontSize:20,fontWeight:800}}>Application received!</div><div style={{fontSize:13,color:C.muted,marginTop:8}}>SwiftRun will reach out within 48 hours to confirm your sprint, vest design, and launch date.</div></div>}
    </div>
  );
}

function GiftErrand() {
  const [selectedType, setSelectedType] = useState(null);
  const [recipient, setRecipient] = useState({name:"",phone:"",area:""});
  const [message, setMessage] = useState("");
  const [payMethod, setPayMethod] = useState(null);
  const [sent, setSent] = useState(false);
  const [view, setView] = useState("compose"); // compose | history
  const [generating, setGenerating] = useState(false);
  const [giftLink, setGiftLink] = useState(null);

  const METHODS = [
    {id:"runpay",name:"RunPay",icon:"⚡",color:"#0D1D46"},
    {id:"orange",name:"Orange Money",icon:"🟠",color:"#FF6A00"},
    {id:"myzaka",name:"MyZaka",icon:"📲",color:"#0072CE"},
    {id:"smega",name:"Smega",icon:"💠",color:"#00A859"},
  ];

  const sc = {delivered:{color:"#10B981",label:"✅ Delivered"},en_route:{color:"#12A4F3",label:"🏃 En route"},scheduled:{color:"#4FA8F0",label:"🕐 Scheduled"}};

  const handleSend = () => {
    setGenerating(true);
    setTimeout(()=>{setGiftLink("swiftrun.bw/gift/"+Math.random().toString(36).slice(2,8).toUpperCase());setGenerating(false);setSent(true);},1800);
  };

  if(sent){
    return (
      <div style={{padding:"56px 28px",maxWidth:520,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16}}>🎁✅</div>
        <h3 style={{fontSize:24,fontWeight:900,marginBottom:8}}>Gift errand sent!</h3>
        <p style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:24}}>A runner is being matched to deliver to <strong style={{color:"#fff"}}>{recipient.name||"your recipient"}</strong> in {recipient.area||"Gaborone"}. You'll get photo proof when it's done.</p>
        <div style={{background:"rgba(236,72,153,0.1)",border:"1px solid rgba(236,72,153,0.3)",borderRadius:14,padding:"20px",marginBottom:24,textAlign:"left"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#FBCFE8",marginBottom:10}}>📲 Share this tracking link with {recipient.name||"them"}</div>
          <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:"#EC4899"}}>{giftLink}</span>
            <button style={{background:"rgba(236,72,153,0.2)",border:"1px solid rgba(236,72,153,0.4)",color:"#FBCFE8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Copy</button>
          </div>
          <div style={{fontSize:11,color:C.dim,marginTop:8}}>They track their runner live. No app download needed</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setView("history")} style={{flex:1,...btn(false,"#EC4899"),padding:"12px"}}>View sent gifts</button>
          <button onClick={()=>{setSent(false);setSelectedType(null);setRecipient({name:"",phone:"",area:""});setMessage("");setPayMethod(null);}} style={{flex:1,background:"linear-gradient(135deg,#EC4899,#0D1D46)",border:"none",color:"#fff",borderRadius:10,padding:"12px",cursor:"pointer",fontSize:14,fontWeight:700}}>Send another</button>
        </div>
      </div>
    );
  }

  if(view==="history"){
    return (
      <div style={{padding:"56px 28px",maxWidth:660,margin:"0 auto"}}>
        <button onClick={()=>setView("compose")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0}}>← Send a gift</button>
        <p style={{fontSize:12,fontWeight:700,color:"#EC4899",letterSpacing:"0.12em",marginBottom:16}}>GIFTS YOU'VE SENT</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {SENT_GIFTS.map(g=>{
            const s=sc[g.status];
            return (
              <div key={g.id} style={{background:`${s.color}10`,border:`1px solid ${s.color}44`,borderRadius:14,padding:"18px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{g.type} → {g.to}</div>
                    <div style={{fontSize:12,color:C.muted,fontStyle:"italic",marginTop:2}}>"{g.msg}"</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,fontWeight:700,color:s.color}}>{s.label}</div>
                    <div style={{fontSize:18,fontWeight:800,marginTop:2}}>P{g.amount}</div>
                  </div>
                </div>
                {g.eta&&<div style={{fontSize:12,color:s.color,fontWeight:600}}>ETA: {g.eta}</div>}
                {g.reaction&&<div style={{marginTop:8,background:"rgba(236,72,153,0.1)",border:"1px solid rgba(236,72,153,0.25)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FBCFE8"}}>💬 {g.reaction}</div>}
                {g.proof&&<div style={{marginTop:8,background:"rgba(16,185,129,0.08)",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#10B981",fontWeight:600}}>📸 Delivery photo proof available</div>}
              </div>
            );
          })}
        </div>
        <button onClick={()=>setView("compose")} style={{width:"100%",marginTop:20,background:"linear-gradient(135deg,#EC4899,#0D1D46)",border:"none",color:"#fff",borderRadius:12,padding:"13px",cursor:"pointer",fontSize:14,fontWeight:700}}>Send another gift →</button>
      </div>
    );
  }

  return (
    <div style={{padding:"56px 28px",maxWidth:860,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#EC4899",letterSpacing:"0.12em",marginBottom:8}}>LEAVE A RUN · GIFT ERRANDS</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:24}}>
        <div>
          <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",margin:0}}>Give someone an errand as a gift.</h2>
          <p style={{color:C.muted,marginTop:6,fontSize:14}}>"I've arranged groceries for you this Saturday." Birthdays, care packages, wellness checks. Pre-pay and your recipient tracks it live.</p>
        </div>
        <button onClick={()=>setView("history")} style={{...btn(false,"#EC4899"),padding:"10px 18px",fontSize:13,fontWeight:700}}>📦 My sent gifts</button>
      </div>

      {/* How it works */}
      <div style={{background:"rgba(236,72,153,0.08)",border:"1px solid rgba(236,72,153,0.2)",borderRadius:14,padding:"20px 24px",marginBottom:28,display:"flex",gap:28,flexWrap:"wrap"}}>
        {[{icon:"💳",step:"You pay",desc:"Pre-pay from anywhere"},{icon:"📱",step:"They track",desc:"Live runner tracking link, no app needed"},{icon:"📸",step:"You get proof",desc:"Photo confirmation on delivery"},{icon:"💬",step:"They react",desc:"Recipient leaves a reaction you see instantly"}].map(({icon,step,desc})=>(
          <div key={step} style={{flex:1,minWidth:100,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
            <div style={{fontSize:12,fontWeight:800,color:"#FBCFE8"}}>{step}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3,lineHeight:1.5}}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Gift type grid */}
      {!selectedType && (
        <div>
          <p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:12}}>CHOOSE A GIFT TYPE</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
            {GIFT_TYPES.map(t=>(
              <button key={t.id} onClick={()=>setSelectedType(t)} style={{...card(false),cursor:"pointer",textAlign:"left",color:"#fff",position:"relative",border:`1px solid ${C.border}`}}>
                {t.popular&&<span style={{...pill("#EC4899"),position:"absolute",top:12,right:12}}>POPULAR</span>}
                <div style={{fontSize:28,marginBottom:10}}>{t.icon}</div>
                <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>{t.title}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.5}}>{t.desc}</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EC4899"}}>{t.price} →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compose form */}
      {selectedType && (
        <div>
          <button onClick={()=>setSelectedType(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0}}>← Change type</button>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:24}}>
            <span style={{fontSize:36}}>{selectedType.icon}</span>
            <div><div style={{fontSize:18,fontWeight:900}}>{selectedType.title}</div><div style={{fontSize:13,color:C.muted}}>{selectedType.price}</div></div>
          </div>

          <p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:12}}>WHO IS THIS GIFT FOR?</p>
          {[{label:"Their name",key:"name",placeholder:"e.g. Mama, Kago, Auntie Dineo"},{label:"Phone (Gaborone)",key:"phone",placeholder:"071 234 5678"},{label:"Delivery area",key:"area",placeholder:"e.g. Extension 9, Phakalane"}].map(({label,key,placeholder})=>(
            <div key={key} style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:C.muted,display:"block",marginBottom:5}}>{label}</label>
              <input value={recipient[key]} onChange={e=>setRecipient(r=>({...r,[key]:e.target.value}))} placeholder={placeholder} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
            </div>
          ))}

          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",display:"block",marginBottom:8}}>PERSONAL MESSAGE <span style={{color:C.dim,fontWeight:400}}>(optional)</span></label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={`e.g. "Happy birthday! Wish I could be there. Love you ❤️"`} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>
            <div style={{fontSize:11,color:C.dim,marginTop:5}}>Printed on a card and handed to them by the runner</div>
          </div>

          {recipient.name && recipient.area && (
            <div style={{marginBottom:20}}>
              <p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:12}}>PAY WITH</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {METHODS.map(m=>(
                  <button key={m.id} onClick={()=>setPayMethod(m)} style={{...btn(payMethod?.id===m.id,m.color),display:"flex",alignItems:"center",gap:8,padding:"10px 14px"}}>
                    <span style={{fontSize:16}}>{m.icon}</span><span>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {payMethod && (
            <div style={{background:"rgba(236,72,153,0.1)",border:"1px solid rgba(236,72,153,0.3)",borderRadius:14,padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{selectedType.title} → {recipient.name||"recipient"}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{recipient.area} · via {payMethod.name}</div>
                </div>
                <div style={{fontSize:20,fontWeight:900,color:"#EC4899"}}>{selectedType.price}</div>
              </div>
              {message&&<div style={{background:"rgba(236,72,153,0.08)",borderRadius:8,padding:"9px 12px",marginBottom:14,fontSize:12,color:C.muted,fontStyle:"italic"}}>💌 "{message}"</div>}
              <button onClick={handleSend} disabled={generating} style={{width:"100%",background:generating?"rgba(236,72,153,0.3)":"linear-gradient(135deg,#EC4899,#0D1D46)",border:"none",color:"#fff",borderRadius:12,padding:"15px",cursor:generating?"not-allowed":"pointer",fontSize:15,fontWeight:800}}>
                {generating?"Arranging your gift…":`🎁 Send gift to ${recipient.name||"them"}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FuturesMarket() {
  const [surge, setSurge] = useState(SURGE);
  const [bids, setBids] = useState(BIDS_INIT);
  const [tab, setTab] = useState("map");
  const [claimed, setClaimed] = useState(null);

  useEffect(()=>{
    const t=setInterval(()=>{
      setSurge(p=>p.map(z=>({...z,demand:Math.min(99,Math.max(20,z.demand+(Math.random()>0.5?1:-1)))})));
      setBids(p=>p.map(b=>({...b,timeLeft:Math.max(0,b.timeLeft-1),current:b.timeLeft>0&&Math.random()>0.88?b.current+Math.floor(Math.random()*3)+1:b.current})));
    },1000);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{padding:"56px 28px",maxWidth:900,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#0C7CF4",letterSpacing:"0.12em",marginBottom:6}}>RUNNER FUTURES MARKET</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Where demand is, the money is.</h2>
      <p style={{color:C.muted,marginBottom:24,fontSize:14}}>Senders bid up prices in real time. Runners race to high-demand zones on a live heat map.</p>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <button onClick={()=>setTab("map")} style={btn(tab==="map","#0C7CF4")}>🗺️ Heat Map</button>
        <button onClick={()=>setTab("bids")} style={btn(tab==="bids","#0C7CF4")}>⚡ Live Bids</button>
      </div>

      {tab==="map"&&(
        <div>
          <div style={{position:"relative",width:"100%",height:300,borderRadius:16,overflow:"hidden",background:"#0a0e18",border:"1px solid rgba(12,124,244,0.2)",marginBottom:16}}>
            <div style={{position:"absolute",top:10,left:14,fontSize:10,fontWeight:700,color:C.dim,letterSpacing:"0.1em"}}>GABORONE: LIVE DEMAND</div>
            {surge.map(z=>{
              const size=20+(z.demand/100)*30;
              return (
                <div key={z.id} style={{position:"absolute",left:`${z.x}%`,top:`${z.y}%`,transform:"translate(-50%,-50%)"}}>
                  <div style={{width:size,height:size,borderRadius:"50%",background:z.color,opacity:0.85,boxShadow:`0 0 ${size}px ${z.color}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,fontWeight:900,color:"#fff"}}>P{z.price+Math.round((z.demand/100)*35)}</span>
                  </div>
                  <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",marginTop:3,fontSize:8,fontWeight:700,color:"#fff",background:"rgba(0,0,0,0.8)",padding:"2px 5px",borderRadius:4,whiteSpace:"nowrap"}}>{z.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
            {[...surge].sort((a,b)=>b.demand-a.demand).map(z=>(
              <div key={z.id} style={{...card(false),padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700}}>{z.name}</span>
                  <span style={{fontSize:12,fontWeight:800,color:z.color}}>P{z.price+Math.round((z.demand/100)*35)}</span>
                </div>
                <div style={{height:3,borderRadius:99,background:"rgba(255,255,255,0.07)",marginBottom:5}}><div style={{height:"100%",width:`${z.demand}%`,background:z.color,borderRadius:99}}/></div>
                <div style={{fontSize:10,color:z.color,fontWeight:700}}>{z.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="bids"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {bids.map(b=>{
            const exp=b.timeLeft===0;
            const isClaimed=claimed===b.id;
            return (
              <div key={b.id} style={{background:isClaimed?"rgba(16,185,129,0.1)":C.card,border:`1px solid ${isClaimed?"#10B981":exp?"rgba(255,255,255,0.05)":C.border}`,borderRadius:12,padding:"16px 18px",opacity:exp?0.4:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{b.errand}</div>
                    <div style={{fontSize:11,color:C.muted}}>{b.bids} bids · Base P{b.base}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:22,fontWeight:900,color:isClaimed?"#10B981":"#12A4F3"}}>P{b.current.toFixed(2)}</div>
                    <div style={{fontSize:11,color:C.muted}}>{exp?"EXPIRED":`${b.timeLeft}s`}</div>
                  </div>
                </div>
                {!exp&&!isClaimed&&<button onClick={()=>{setClaimed(b.id);setTimeout(()=>setClaimed(null),3000);}} style={{width:"100%",background:"linear-gradient(135deg,#10B981,#06B6D4)",border:"none",color:"#fff",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,fontWeight:800}}>Claim at P{b.current.toFixed(2)} ✓</button>}
                {isClaimed&&<div style={{textAlign:"center",fontSize:13,fontWeight:700,color:"#10B981"}}>✅ Run claimed. Navigating to pickup</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stores() {
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState({});
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = STORES.filter(s=>!search||`${s.name}${s.cat}${s.loc}`.toLowerCase().includes(search.toLowerCase()));
  const cartTotal = Object.entries(cart).reduce((sum,[name,qty])=>{
    const item=selected?.items.find(i=>i.n===name);
    return sum+(item?item.p*qty:0);
  },0);
  const cartCount=Object.values(cart).reduce((a,b)=>a+b,0);

  if(done) return <div style={{padding:"56px 28px",maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:56,marginBottom:16}}>🏃✅</div><h3 style={{fontSize:22,fontWeight:800}}>Order placed!</h3><p style={{color:C.muted,fontSize:13,marginTop:8}}>A runner is being matched to pick up and deliver.</p><button onClick={()=>{setDone(false);setSelected(null);setCart({});}} style={{marginTop:20,background:"linear-gradient(135deg,#12A4F3,#0C7CF4)",border:"none",color:"#fff",borderRadius:10,padding:"12px 24px",cursor:"pointer",fontSize:14,fontWeight:700}}>Browse more</button></div>;

  if(selected) return (
    <div style={{padding:"56px 28px",maxWidth:600,margin:"0 auto"}}>
      <button onClick={()=>{setSelected(null);setCart({});}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0}}>← All stores</button>
      <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:24}}>
        <span style={{fontSize:44}}>{selected.icon}</span>
        <div>
          <div style={{fontSize:20,fontWeight:900}}>{selected.name}{selected.verified?" ✓":""}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>{selected.cat} · 📍{selected.loc}</div>
          <div style={{display:"flex",gap:12,marginTop:4}}><span style={{fontSize:13,fontWeight:700,color:"#12A4F3"}}>⭐{selected.rating}</span><span style={{fontSize:12,color:C.muted}}>{selected.deliveries} deliveries</span></div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {selected.items.map(item=>{
          const qty=cart[item.n]||0;
          return (
            <div key={item.n} style={{...card(qty>0,selected.color),display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:26}}>{item.e}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{item.n}</div><div style={{fontSize:15,fontWeight:800,color:selected.color,marginTop:2}}>P{item.p}</div></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {qty>0&&<button onClick={()=>setCart(p=>{const n={...p};n[item.n]>1?n[item.n]--:delete n[item.n];return n;})} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>}
                {qty>0&&<span style={{fontSize:13,fontWeight:700}}>{qty}</span>}
                <button onClick={()=>setCart(p=>({...p,[item.n]:(p[item.n]||0)+1}))} style={{width:28,height:28,borderRadius:"50%",background:selected.color,border:"none",color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      {cartCount>0&&<div style={{background:"rgba(18,164,243,0.1)",border:"1px solid rgba(18,164,243,0.35)",borderRadius:12,padding:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={{fontSize:13,fontWeight:700}}>{cartCount} item{cartCount>1?"s":""}</span><span style={{fontSize:22,fontWeight:900,color:"#12A4F3"}}>P{cartTotal}</span></div>
        <button onClick={()=>setDone(true)} style={{width:"100%",background:"linear-gradient(135deg,#12A4F3,#0C7CF4)",border:"none",color:"#fff",borderRadius:10,padding:"13px",cursor:"pointer",fontSize:14,fontWeight:800}}>Order ⚡</button>
      </div>}
    </div>
  );

  return (
    <div style={{padding:"56px 28px",maxWidth:880,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#12A4F3",letterSpacing:"0.12em",marginBottom:8}}>SWIFTRUN STOREFRONTS</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Gaborone's hyperlocal marketplace.</h2>
      <p style={{color:C.muted,marginBottom:20,fontSize:14}}>Order from local bakers, tailors, and hardware stalls. Runner delivers within the hour.</p>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stores, products, areas…" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none",marginBottom:20}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {filtered.map(s=>(
          <button key={s.id} onClick={()=>setSelected(s)} style={{...card(false),cursor:"pointer",textAlign:"left",color:"#fff",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:34}}>{s.icon}</span>
              <div><div style={{fontSize:14,fontWeight:800}}>{s.name}{s.verified?" ✓":""}</div><div style={{fontSize:11,color:C.muted}}>{s.cat} · {s.loc}</div></div>
            </div>
            <div style={{display:"flex",gap:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#12A4F3"}}>⭐{s.rating}</span>
              <span style={{fontSize:11,color:C.muted}}>{s.deliveries} deliveries</span>
              <span style={{fontSize:11,color:C.dim,marginLeft:"auto"}}>View menu →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Score() {
  const [active, setActive] = useState(null);
  const score=742;
  const breakdown=[
    {label:"TrustScore",value:4.8,max:5,color:"#4FA8F0"},
    {label:"Completion Rate",value:98.2,max:100,color:"#10B981",suf:"%"},
    {label:"Earnings Consistency",value:82,max:100,color:"#06B6D4",suf:"%"},
    {label:"Community Vouches",value:3,max:5,color:"#12A4F3"},
    {label:"Tenure (months)",value:8,max:24,color:"#EC4899"},
  ];
  return (
    <div style={{padding:"56px 28px",maxWidth:820,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#10B981",letterSpacing:"0.12em",marginBottom:8}}>SWIFTRUN SCORE</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Your runs are your credit history.</h2>
      <p style={{color:C.muted,marginBottom:32,fontSize:14}}>Every delivery builds a verified financial identity. Banks see what formal credit bureaus can't.</p>
      <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:20,padding:"32px",marginBottom:28,display:"flex",gap:32,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flexShrink:0}}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray={`${(score/850)*314} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" style={{filter:"drop-shadow(0 0 8px #10B981)"}}/>
          </svg>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:900,color:"#10B981",lineHeight:1}}>{score}</div>
            <div style={{fontSize:10,fontWeight:700,color:"#10B981",marginTop:2}}>PRIME</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>SwiftRun Score: <span style={{color:"#10B981"}}>{score}</span></div>
          <div style={{fontSize:13,color:C.muted,marginBottom:18}}>Top 15% of runners · 238 runs · P18,420 lifetime earnings</div>
          {breakdown.map(b=>(
            <div key={b.label} style={{marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.muted}}>{b.label}</span><span style={{fontSize:11,fontWeight:700,color:b.color}}>{b.value}{b.suf||""}/{b.max}{b.suf||""}</span></div>
              <div style={{height:3,borderRadius:99,background:"rgba(255,255,255,0.07)"}}><div style={{height:"100%",width:`${(b.value/b.max)*100}%`,background:b.color,borderRadius:99}}/></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {LOANS.map(l=>(
          <div key={l.id} onClick={()=>setActive(active===l.id?null:l.id)} style={{...card(active===l.id,l.color),cursor:"pointer"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}><span style={{fontSize:24}}>{l.icon}</span><div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{l.name}</div><div style={{fontSize:11,color:l.color}}>{l.partner}</div></div></div>
            <div style={{fontSize:15,fontWeight:800,color:l.color,marginBottom:4}}>{l.amount}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{l.desc}</div>
            {active===l.id&&<button style={{marginTop:12,width:"100%",background:`linear-gradient(135deg,${l.color},#0D1D46)`,border:"none",color:"#fff",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:13,fontWeight:700}}>Apply: use SwiftRun Score as proof</button>}
          </div>
        ))}
      </div>
      <div style={{...card(false),marginTop:24,textAlign:"left"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#0C7CF4",letterSpacing:"0.1em",marginBottom:10}}>COVERAGE: ALL OF BOTSWANA</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Gaborone","Francistown","Maun","Kasane","Lobatse","Selebi-Phikwe","Serowe","Molepolole","Palapye","Kanye","Jwaneng","Orapa","Ghanzi","Tsabong"].map(t=>(
            <span key={t} style={{fontSize:12,color:"#fff",background:"rgba(12,124,244,0.12)",border:"1px solid rgba(12,124,244,0.3)",borderRadius:20,padding:"6px 12px"}}>{t}</span>
          ))}
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:10,lineHeight:1.6}}>Runners on the ground in every major town. If you are in Botswana, SwiftRun can reach you.</div>
      </div>
      <div style={{...card(false),marginTop:12,textAlign:"left"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#10B981",letterSpacing:"0.1em",marginBottom:8}}>SUPPORT</div>
        <div style={{fontSize:15,fontWeight:800,marginBottom:4}}>Need help? Talk to us.</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Call or WhatsApp the SwiftRun team on <span style={{color:"#fff",fontWeight:700}}>72173308</span>.</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <a href="tel:+26772173308" style={{background:"#10B981",color:"#fff",borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:700,textDecoration:"none"}}>📞 Call 72173308</a>
          <a href="https://wa.me/26772173308" target="_blank" rel="noreferrer" style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.4)",color:"#fff",borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp Us</a>
        </div>
      </div>
    </div>
  );
}

// ── OFFLINE ERRAND PLANNER ──
// Keyword-based local planner. No network, no API keys. Works anywhere in Botswana.
const BW_SPOTS = ["Princess Marina","Clicks","Game City","CBD","Main Mall","Phakalane","Extension 9","Ext 9","Riverwalk","Airport Junction","Broadhurst","BPC","Ministry of Labour","Chicken Licken","Home Affairs","Gaborone","Francistown","Maun","Kasane","Lobatse","Selebi-Phikwe","Serowe","Molepolole","Palapye","Kanye","Jwaneng","Orapa","Ghanzi","Tsabong"];
const TASK_RULES = [
  {re:/meds|medication|pharmacy|clicks|prescription|pills/i,task:"Medication pickup",lo:65,hi:140,note:"Bring the prescription or clinic card"},
  {re:/groc|shopping|pick n pay|\bspar\b|choppies|shoprite|woolworth/i,task:"Grocery shopping run",lo:120,hi:350,note:"Runner shops your list and sends the till slip"},
  {re:/lunch|meal|food|chicken licken|kfc|nando|debonaire|restaurant|takeaway|pizza/i,task:"Meal pickup and delivery",lo:60,hi:150,note:"Food collected hot and delivered fast"},
  {re:/bill|electricity|\bbpc\b|water|prepaid|airtime|data/i,task:"Bill payment run",lo:50,hi:90,note:"Receipt photo sent back to you"},
  {re:/\bid\b|omang|licen[cs]e|ministry|home affairs|government|passport/i,task:"Government office run",lo:70,hi:180,note:"Bring your ID and any reference numbers"},
  {re:/document|\bdoc\b|legal|lawyer|signed|contract/i,task:"Document run",lo:70,hi:180,note:"Ask the sender to seal documents in an envelope"},
  {re:/parcel|package|courier|deliver|\bdrop\b|collect|pick ?up|\bsend\b/i,task:"Parcel run",lo:60,hi:160,note:"Parcel tracked from pickup to door"},
];
function planErrandsOffline(q){
  const clauses = q.split(/[,.;]|\bthen\b|\band then\b/i).map(s=>s.trim()).filter(s=>s.length>2).slice(0,4);
  const list = clauses.length?clauses:[q];
  const runs = list.map((clause,idx)=>{
    const rule = TASK_RULES.find(r=>r.re.test(clause)) || {task:"Errand run",lo:60,hi:160,note:"Runner calls to confirm details before starting"};
    const found = BW_SPOTS.filter(s=>new RegExp("\\b"+s.replace(/[.\\+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(clause));
    const seed = (clause.length*37 + idx*53 + clause.charCodeAt(0)) % 100;
    const price = Math.round((rule.lo + (rule.hi-rule.lo)*seed/100)*10)/10;
    return {id:idx+1, task:rule.task, pickup:found[0]||"Your location", dropoff:found[1]||found[0]||"Destination", price, note:rule.note};
  });
  const total = Math.round(runs.reduce((a,r)=>a+r.price,0)*10)/10;
  return {summary:runs.length+(runs.length===1?" run planned":" runs planned")+". Prices in Pula.", totalEstimate:total, totalTime:(runs.length*25)+" to "+(runs.length*45)+" min", runs};
}

function Concierge() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState(null);

  const ask = () => {
    if(!q.trim()) return;
    setLoading(true); setResult(null); setErr(null); setConfirmed(false);
    try {
      setTimeout(()=>{ setResult(planErrandsOffline(q.trim())); setLoading(false); }, 500);
    } catch(e){ setErr("Couldn't plan that errand. Try describing the pickup and drop-off places."); setLoading(false); }
  };

  const EXAMPLES = ["Pick up my mum's meds from Clicks Game City, collect a signed document from my lawyer in CBD, drop both at Phakalane","Pay my electricity bill at BPC offices, collect my ID from Ministry of Labour, buy lunch from Chicken Licken"];

  return (
    <div style={{padding:"56px 28px",maxWidth:720,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#4FA8F0",letterSpacing:"0.12em",marginBottom:8}}>AI ERRAND CONCIERGE</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Describe it. We'll sort it.</h2>
      <p style={{color:C.muted,marginBottom:28,fontSize:14}}>Describe complex multi-stop errands in plain language. The planner splits them into runs and estimates cost and time. Runs on your phone. No internet needed.</p>
      <div style={{background:"rgba(12,124,244,0.07)",border:"1px solid rgba(12,124,244,0.25)",borderRadius:16,padding:"20px",marginBottom:20}}>
        <textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. Take my mum to collect her results at Princess Marina, pick up her meds from Clicks Game City, drop both at her place in Ext 9…" rows={4} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(12,124,244,0.3)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none",resize:"vertical",lineHeight:1.7,fontFamily:"inherit"}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
          <button onClick={ask} disabled={loading||!q.trim()} style={{background:loading?"rgba(12,124,244,0.3)":"linear-gradient(135deg,#0D1D46,#06B6D4)",border:"none",color:"#fff",borderRadius:10,padding:"11px 22px",cursor:loading||!q.trim()?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>{loading?"Planning…":"Plan My Errands →"}</button>
        </div>
      </div>
      {!result&&!loading&&<div style={{marginBottom:24}}><p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:10}}>TRY AN EXAMPLE</p>{EXAMPLES.map((ex,i)=><button key={i} onClick={()=>setQ(ex)} style={{display:"block",width:"100%",...card(false),cursor:"pointer",textAlign:"left",color:C.muted,fontSize:12,lineHeight:1.5,marginBottom:8}}>"{ex}"</button>)}</div>}
      {loading&&<div style={{textAlign:"center",padding:"32px"}}><div style={{fontSize:32,marginBottom:10}}>🧠</div><div style={{fontSize:15,fontWeight:700,color:"#4FA8F0"}}>Planning your errands…</div></div>}
      {err&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,padding:"13px 16px",fontSize:13,color:"#FCA5A5"}}>⚠️ {err}</div>}
      {result&&!confirmed&&<div style={{background:"rgba(12,124,244,0.08)",border:"1px solid rgba(12,124,244,0.3)",borderRadius:14,padding:"22px"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{result.summary}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{result.totalTime} · Est. P{result.totalEstimate}</div>
        {result.runs?.map(r=><div key={r.id} style={{...card(false),marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700}}>{r.task}</div>
          <div style={{fontSize:11,color:C.muted,marginTop:3}}>{r.pickup} → {r.dropoff} · P{r.price}</div>
          {r.note&&<div style={{fontSize:11,color:C.dim,marginTop:3}}>Note: {r.note}</div>}
        </div>)}
        <button onClick={()=>setConfirmed(true)} style={{width:"100%",marginTop:8,background:"linear-gradient(135deg,#0D1D46,#06B6D4)",border:"none",color:"#fff",borderRadius:10,padding:"13px",cursor:"pointer",fontSize:14,fontWeight:700}}>Confirm & Book All Runs →</button>
      </div>}
      {confirmed&&<div style={{textAlign:"center",padding:"32px"}}><div style={{fontSize:44,marginBottom:12}}>🏃✅</div><div style={{fontSize:18,fontWeight:800}}>Errands booked!</div><div style={{fontSize:13,color:C.muted,marginTop:6}}>Runners matched. Live tracking links sent via SMS.</div></div>}
    </div>
  );
}

function Franchise() {
  const FZONES = [
    {name:"Extension 9",captain:"Bakang M.",earnings:"P3,840",runs:960,status:"active",color:"#10B981"},
    {name:"CBD / Main Mall",captain:"Portia S.",earnings:"P5,200",runs:1300,status:"active",color:"#3B82F6"},
    {name:"Game City Area",captain:null,earnings:null,runs:0,status:"open",color:"#0C7CF4"},
    {name:"Phakalane",captain:null,earnings:null,runs:0,status:"open",color:"#12A4F3"},
    {name:"Broadhurst",captain:"Lethiwe K.",earnings:"P2,160",runs:540,status:"building",color:"#4FA8F0"},
  ];
  const [applied,setApplied]=useState(false);
  return (
    <div style={{padding:"56px 28px",maxWidth:880,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#4FA8F0",letterSpacing:"0.12em",marginBottom:8}}>ZONE CAPTAIN FRANCHISE</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Lead your zone. Build your team.</h2>
      <p style={{color:C.muted,marginBottom:24,fontSize:14}}>Recruit and manage 10 runners in your neighbourhood. Earn 4% of every run your team completes.</p>
      <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:14,padding:"14px 18px",marginBottom:24,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:24}}>🏃</span>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>Bakang M. · 528 runs · TrustScore 4.9</div><div style={{fontSize:12,color:"#10B981",marginTop:2}}>✅ You qualify. 500+ runs, TrustScore 4.8+</div></div>
        {!applied?<button onClick={()=>setApplied(true)} style={{background:"linear-gradient(135deg,#0D1D46,#10B981)",border:"none",color:"#fff",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontSize:13,fontWeight:700}}>Apply to lead a zone</button>:<span style={{fontSize:13,fontWeight:700,color:"#10B981"}}>✅ Application submitted</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {FZONES.map(z=>(
          <div key={z.name} style={{...card(z.status==="open","#0C7CF4")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:800}}>{z.name}</div>
              <span style={{...pill(z.status==="open"?"#0C7CF4":z.status==="building"?"#12A4F3":"#10B981"),fontSize:10}}>{z.status.toUpperCase()}</span>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{z.captain?`Captain: ${z.captain}`:"No captain yet. Open"}</div>
            {z.earnings&&<div style={{fontSize:18,fontWeight:900,color:"#10B981"}}>{z.earnings}<span style={{fontSize:11,color:C.muted,fontWeight:400}}>/mo</span></div>}
            {!z.captain&&<div style={{fontSize:12,color:C.muted}}>Be the first captain. Recruit your team, earn from day one.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Diaspora() {
  const COUNTRIES=[{code:"gb",flag:"🇬🇧",name:"UK",topUp:"Wise · Remitly"},{code:"za",flag:"🇿🇦",name:"South Africa",topUp:"EFT · Capitec"},{code:"us",flag:"🇺🇸",name:"USA",topUp:"Wise · PayPal"},{code:"au",flag:"🇦🇺",name:"Australia",topUp:"Wise · BPay"},{code:"bw",flag:"🇧🇼",name:"Botswana",topUp:"RunPay"}];
  const TYPES=[{id:"g",icon:"🛒",title:"Groceries",price:"P120 to P350"},{id:"m",icon:"💊",title:"Medication",price:"P65 to P140"},{id:"b",icon:"🎂",title:"Birthday",price:"P80 to P250"},{id:"d",icon:"📄",title:"Documents",price:"P70 to P180"}];
  const [country,setCountry]=useState(null);
  const [type,setType]=useState(null);
  const [rec,setRec]=useState({name:"",area:""});
  const [done,setDone]=useState(false);

  if(done) return <div style={{padding:"56px 28px",maxWidth:500,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:56,marginBottom:16}}>✈️🏃✅</div><h3 style={{fontSize:22,fontWeight:800}}>Errand scheduled!</h3><p style={{color:C.muted,fontSize:13,marginTop:8}}>A runner will handle it in Gaborone. You'll get photo proof when done.</p><button onClick={()=>{setDone(false);setCountry(null);setType(null);setRec({name:"",area:""}); }} style={{marginTop:20,background:"linear-gradient(135deg,#06B6D4,#0D1D46)",border:"none",color:"#fff",borderRadius:10,padding:"12px 24px",cursor:"pointer",fontSize:14,fontWeight:700}}>Send another</button></div>;

  return (
    <div style={{padding:"56px 28px",maxWidth:820,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#06B6D4",letterSpacing:"0.12em",marginBottom:8}}>SWIFTRUN FOR DIASPORA</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:6}}>Be there for your family. Even from London.</h2>
      <p style={{color:C.muted,marginBottom:28,fontSize:14}}>Top up from anywhere. A runner handles it in Gaborone. Your grandmother gets groceries, you get photo proof.</p>
      <div style={{marginBottom:24}}>
        <p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:10}}>WHERE ARE YOU SENDING FROM?</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {COUNTRIES.map(c=><button key={c.code} onClick={()=>setCountry(c)} style={{...btn(country?.code===c.code,"#06B6D4"),display:"flex",alignItems:"center",gap:8,padding:"10px 14px"}}><span style={{fontSize:18}}>{c.flag}</span><div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:700}}>{c.name}</div><div style={{fontSize:10,color:C.dim}}>{c.topUp}</div></div></button>)}
        </div>
      </div>
      {country&&<div style={{marginBottom:24}}>
        <p style={{fontSize:11,fontWeight:700,color:C.dim,letterSpacing:"0.1em",marginBottom:10}}>WHAT DO YOU NEED DONE IN GABORONE?</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {TYPES.map(t=><button key={t.id} onClick={()=>setType(t)} style={{...btn(type?.id===t.id,"#06B6D4"),padding:"12px 16px"}}><div style={{fontSize:20,marginBottom:4}}>{t.icon}</div><div style={{fontSize:12,fontWeight:700}}>{t.title}</div><div style={{fontSize:11,color:"#67E8F9",marginTop:2}}>{t.price}</div></button>)}
        </div>
      </div>}
      {type&&<div style={{marginBottom:20}}>
        {[{label:"Recipient's name",key:"name",placeholder:"e.g. Mama, Kgomotso"},{label:"Area (Gaborone)",key:"area",placeholder:"e.g. Extension 9, Block 6"}].map(({label,key,placeholder})=>(
          <div key={key} style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:600,color:C.muted,display:"block",marginBottom:5}}>{label}</label><input value={rec[key]} onChange={e=>setRec(r=>({...r,[key]:e.target.value}))} placeholder={placeholder} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
        ))}
        {rec.name&&rec.area&&<button onClick={()=>setDone(true)} style={{width:"100%",background:"linear-gradient(135deg,#06B6D4,#0D1D46)",border:"none",color:"#fff",borderRadius:10,padding:"14px",cursor:"pointer",fontSize:15,fontWeight:800}}>{country.flag} → 🇧🇼 Schedule errand ✈️</button>}
      </div>}
    </div>
  );
}

function Enterprise() {
  const SECTORS=[
    {icon:"🏦",name:"Banks & Financial",color:"#3B82F6",tag:"FINANCIAL",uses:["Cheque & cash delivery to clients","KYC document collection","Secure card & PIN delivery","Interbank document transfer"]},
    {icon:"⚖️",name:"Law Firms",color:"#8B5CF6",tag:"LEGAL",uses:["Court filing delivery & receipt","Summons hand-delivery with signature","Confidential brief transfer","Notarized document courier"]},
    {icon:"🏥",name:"Hospitals & Clinics",color:"#10B981",tag:"HEALTHCARE",uses:["Lab specimen transport","Prescription delivery to patients","Medical records transfer","Urgent blood transport priority routing"]},
    {icon:"🏛️",name:"Government",color:"#12A4F3",tag:"PUBLIC SECTOR",uses:["Permit & licence distribution","Inter-departmental courier","Citizen service delivery (IDs)","Court document processing"]},
    {icon:"🎓",name:"Universities & Schools",color:"#EC4899",tag:"EDUCATION",uses:["Exam paper secure transport","Certificate & transcript delivery","Library inter-loan courier","Staff HR document processing"]},
    {icon:"🏢",name:"Corporates",color:"#06B6D4",tag:"CORPORATE",uses:["Inter-office document runs","Payroll envelope delivery","Signed contract collection","Sample & prototype courier"]},
  ];
  const [sel,setSel]=useState(null);
  return (
    <div style={{padding:"56px 28px",maxWidth:880,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#3B82F6",letterSpacing:"0.12em",marginBottom:8}}>ENTERPRISE</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:24}}>SwiftRun for organisations.</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {SECTORS.map(s=>(
          <button key={s.name} onClick={()=>setSel(sel===s.name?null:s.name)} style={{...card(sel===s.name,s.color),cursor:"pointer",textAlign:"left",color:"#fff"}}>
            <span style={{fontSize:28,marginBottom:8,display:"block"}}>{s.icon}</span>
            <div style={{fontSize:10,fontWeight:700,color:s.color,letterSpacing:"0.08em",marginBottom:4}}>{s.tag}</div>
            <div style={{fontSize:14,fontWeight:800,marginBottom:sel===s.name?12:0}}>{s.name}</div>
            {sel===s.name&&s.uses.map(u=><div key={u} style={{fontSize:12,color:C.muted,marginBottom:4}}>· {u}</div>)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Features() {
  const TAGS=["ALL",...new Set(FEATURES_LIST.map(f=>f.tag))];
  const [tag,setTag]=useState("ALL");
  const filtered=tag==="ALL"?FEATURES_LIST:FEATURES_LIST.filter(f=>f.tag===tag);
  return (
    <div style={{padding:"56px 28px",maxWidth:880,margin:"0 auto"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#0C7CF4",letterSpacing:"0.12em",marginBottom:8}}>ALL FEATURES</p>
      <h2 style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",marginBottom:20}}>The full SwiftRun stack.</h2>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
        {TAGS.map(t=><button key={t} onClick={()=>setTag(t)} style={btn(tag===t,"#0C7CF4")}>{t}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {filtered.map(f=>(
          <div key={f.title} style={{...card(false),padding:"18px"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
              <span style={{fontSize:24}}>{f.icon}</span>
              <div><div style={{fontSize:10,fontWeight:700,color:C.dim,letterSpacing:"0.08em",marginBottom:2}}>{f.tag}</div><div style={{fontSize:13,fontWeight:700}}>{f.title}</div></div>
            </div>
            <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.6}}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──
export default function App() {
  const [screen, setScreen] = useState(S.HOME);

  const NAV=[
    {id:S.HOME,label:"Home",icon:"🏠"},{id:S.FEATURES,label:"Features",icon:"✨"},
    {id:S.MARKET,label:"Market",icon:"📈"},{id:S.CONCIERGE,label:"AI",icon:"🤖"},
    {id:S.STORES,label:"Stores",icon:"🏬"},{id:S.LEADERBOARD,label:"Boards",icon:"🏆"},
    {id:S.GIFT,label:"Gifts",icon:"🎁"},{id:S.FRANCHISE,label:"Franchise",icon:"👑"},
    {id:S.DIASPORA,label:"Diaspora",icon:"✈️"},{id:S.SCORE,label:"Score",icon:"🏦"},
    {id:S.ENTERPRISE,label:"Enterprise",icon:"🏢"},
  ];

  const render=()=>{
    switch(screen){
      case S.MARKET: return <FuturesMarket/>;
      case S.CONCIERGE: return <Concierge/>;
      case S.STORES: return <Stores/>;
      case S.LEADERBOARD: return <Leaderboard/>;
      case S.GIFT: return <GiftErrand/>;
      case S.FRANCHISE: return <Franchise/>;
      case S.DIASPORA: return <Diaspora/>;
      case S.SCORE: return <Score/>;
      case S.ENTERPRISE: return <Enterprise/>;
      case S.FEATURES: return <Features/>;
      default: return <Home setScreen={setScreen}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:"#fff",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(7,11,20,0.94)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"0 16px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:2,overflowX:"auto",scrollbarWidth:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",marginRight:14,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:9,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(12,124,244,0.25)"}}>
              <img src={LOGO_ICON} alt="" style={{width:24,height:"auto",display:"block"}}/>
            </div>
            <div style={{fontSize:16,fontWeight:900}}><span style={{color:"#0C7CF4"}}>Swift</span>Run</div>
          </div>
          {NAV.map(({id,label,icon})=>(
            <button key={id} onClick={()=>setScreen(id)} style={{background:screen===id?"rgba(255,255,255,0.08)":"none",border:"none",color:screen===id?"#fff":C.muted,borderRadius:8,padding:"8px 10px",cursor:"pointer",fontSize:12,fontWeight:screen===id?700:400,whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
      {render()}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"22px 16px 48px",textAlign:"center",maxWidth:880,margin:"0 auto"}}>
        <div style={{fontSize:12,color:C.muted}}>SwiftRun support: <a href="tel:+26772173308" style={{color:"#0C7CF4",fontWeight:700,textDecoration:"none"}}>+267 72173308</a> · <a href="https://wa.me/26772173308" target="_blank" rel="noreferrer" style={{color:"#0C7CF4",fontWeight:700,textDecoration:"none"}}>WhatsApp</a></div>
        <div style={{fontSize:11,color:C.dim,marginTop:6}}>Demo build. All data shown is sample data.</div>
      </div>
    </div>
  );
}

function Home({setScreen}){
  const QUICK=[
    {icon:"📈",label:"Futures Market",s:S.MARKET,color:"#0C7CF4"},
    {icon:"🤖",label:"AI Concierge",s:S.CONCIERGE,color:"#4FA8F0"},
    {icon:"🏬",label:"Storefronts",s:S.STORES,color:"#12A4F3"},
    {icon:"🏆",label:"Leaderboards",s:S.LEADERBOARD,color:"#12A4F3"},
    {icon:"🎁",label:"Gift Errands",s:S.GIFT,color:"#EC4899"},
    {icon:"👑",label:"Franchise",s:S.FRANCHISE,color:"#4FA8F0"},
    {icon:"✈️",label:"Diaspora",s:S.DIASPORA,color:"#06B6D4"},
    {icon:"🏦",label:"SwiftRun Score",s:S.SCORE,color:"#10B981"},
    {icon:"🏢",label:"Enterprise",s:S.ENTERPRISE,color:"#3B82F6"},
  ];
  return (
    <div style={{maxWidth:880,margin:"0 auto",padding:"80px 28px 60px",textAlign:"center"}}>
      <p style={{fontSize:12,fontWeight:700,color:"#0C7CF4",letterSpacing:"0.12em",marginBottom:14}}>GABORONE'S RUNNER ECONOMY</p>
      <div style={{display:"inline-block",background:"#fff",borderRadius:24,padding:"20px 32px 14px",marginBottom:20,boxShadow:"0 8px 32px rgba(12,124,244,0.18)"}}>
        <img src={LOGO_FULL} alt="SwiftRun. We run errands. You save time." style={{width:260,maxWidth:"100%",display:"block"}}/>
      </div>
      <p style={{fontSize:16,color:C.muted,maxWidth:500,margin:"0 auto 32px",lineHeight:1.7}}>The operating system for informal urban logistics in Botswana. Errands, storefronts, leaderboards. Powered by a trusted runner network.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:56}}>
        <button onClick={()=>setScreen(S.CONCIERGE)} style={{background:"linear-gradient(135deg,#0C7CF4,#0D1D46)",border:"none",color:"#fff",borderRadius:12,padding:"13px 26px",cursor:"pointer",fontSize:14,fontWeight:800}}>🤖 AI Errand Planner</button>
        <button onClick={()=>setScreen(S.FEATURES)} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,color:"#fff",borderRadius:12,padding:"13px 26px",cursor:"pointer",fontSize:14,fontWeight:700}}>Explore all features →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,textAlign:"center"}}>
        {QUICK.map(({icon,label,s,color})=>(
          <button key={s} onClick={()=>setScreen(s)} style={{...card(false),cursor:"pointer",color:"#fff",padding:"20px 14px"}}>
            <div style={{fontSize:30,marginBottom:8}}>{icon}</div>
            <div style={{fontSize:12,fontWeight:700,color}}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
