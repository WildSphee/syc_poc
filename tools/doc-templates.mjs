// Sample supporting documents for the SYC filing demo, modelled on real Singapore
// formats (ROMM Certificate of Marriage, NRIC, MCP certificate, birth certificate,
// HDB & CPF statements, talak evidence) using the fictional demo case.
//
// Every document carries a visible SPECIMEN watermark and fictional identifiers —
// these are demo artifacts for uploading into the assistant, NOT genuine documents.

const BASE = `
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Georgia','Times New Roman',serif}
  body{background:#fff}
  .page{position:relative;overflow:hidden;background:#fff}
  .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
  .wm span{transform:rotate(-30deg);font-size:54px;font-weight:800;letter-spacing:6px;color:rgba(180,30,20,.10);
    border:6px solid rgba(180,30,20,.10);padding:14px 40px;border-radius:10px;text-align:center;line-height:1.2;font-family:Arial,sans-serif}
  .crest{font-size:34px;text-align:center}
  .gov{text-align:center;letter-spacing:1px}
  .rule{height:2px;background:#7a1f17;margin:10px 0}
  .row{display:flex;padding:5px 0;border-bottom:1px dotted #ccc}
  .k{width:46%;color:#555}.v{width:54%;font-weight:700;color:#1a1a1a}
  .specimen-note{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:10px;color:#a33;font-family:Arial,sans-serif}
`;

const wm = `<div class="wm"><span>SPECIMEN<br>NOT A GENUINE DOCUMENT</span></div>`;
const note = `<div class="specimen-note">SPECIMEN — mock document generated for the SYC assistant demo. Fictional data. Not issued by any authority.</div>`;
const page = (w, h, inner) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
   .page{width:${w}px;height:${h}px}</style></head><body>
   <div class="page">${wm}${inner}${note}</div></body></html>`;

export const templates = [
  // ── ROMM Certificate of Marriage ──
  {
    name: 'marriage-cert-romm',
    width: 820, height: 1080,
    html: page(820, 1080, `
      <div style="padding:48px 56px">
        <div class="crest">☪</div>
        <div class="gov" style="font-size:13px;margin-top:6px">REPUBLIC OF SINGAPORE</div>
        <div class="gov" style="font-size:18px;font-weight:700;color:#7a1f17">REGISTRY OF MUSLIM MARRIAGES</div>
        <div class="gov" style="font-size:12px;margin-top:2px">Pendaftaran Perkahwinan Orang Islam</div>
        <div class="rule"></div>
        <div style="text-align:center;font-size:20px;font-weight:700;letter-spacing:2px;margin:14px 0">CERTIFICATE OF MARRIAGE</div>
        <div style="text-align:center;font-size:12px;color:#555;margin-bottom:18px">Sijil Perkahwinan</div>
        <div class="row"><div class="k">Certificate No. / No. Sijil</div><div class="v">ROMM/2010/0042378</div></div>
        <div class="row"><div class="k">Date of Marriage / Tarikh Nikah</div><div class="v">12 February 2010</div></div>
        <div class="row"><div class="k">Place of Marriage / Tempat</div><div class="v">Masjid Al-Falah, Singapore</div></div>
        <div class="rule"></div>
        <div style="display:flex;gap:24px;margin-top:8px">
          <div style="flex:1">
            <div style="font-weight:700;color:#7a1f17;margin-bottom:6px">HUSBAND / SUAMI</div>
            <div class="row"><div class="k">Name</div><div class="v">Ahmad Fadzillah Bin Ramli</div></div>
            <div class="row"><div class="k">NRIC</div><div class="v">S8534567B</div></div>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;color:#7a1f17;margin-bottom:6px">WIFE / ISTERI</div>
            <div class="row"><div class="k">Name</div><div class="v">Nur Aisyah Binte Mohd Yusof</div></div>
            <div class="row"><div class="k">NRIC</div><div class="v">S8812345A</div></div>
          </div>
        </div>
        <div class="rule"></div>
        <div class="row"><div class="k">Wali / Guardian</div><div class="v">Mohd Yusof Bin Ibrahim (Father)</div></div>
        <div class="row"><div class="k">Mahr / Mas Kahwin</div><div class="v">SGD 4,500.00 (Cash)</div></div>
        <div class="row"><div class="k">Witness 1 / Saksi</div><div class="v">Ismail Bin Abdullah</div></div>
        <div class="row"><div class="k">Witness 2 / Saksi</div><div class="v">Yusuf Bin Hassan</div></div>
        <div class="row"><div class="k">Kadi</div><div class="v">Ustaz Hamzah Bin Salim</div></div>
        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px;color:#555">
          <div>__________________________<br>Registrar of Muslim Marriages</div>
          <div style="text-align:right">Issued: 12 Feb 2010<br>Seal: ROMM</div>
        </div>
      </div>`),
  },

  // ── NRIC (Plaintiff) ──
  {
    name: 'nric-plaintiff',
    width: 660, height: 416,
    html: page(660, 416, `
      <div style="padding:26px 30px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:13px;letter-spacing:1px;color:#7a1f17">REPUBLIC OF SINGAPORE</div>
            <div style="font-size:15px;font-weight:700">IDENTITY CARD</div>
          </div>
          <div style="font-size:30px">🦁</div>
        </div>
        <div class="rule"></div>
        <div style="display:flex;gap:20px;margin-top:10px">
          <div style="width:120px;height:150px;background:#eee;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;color:#999;font-family:Arial;font-size:11px;text-align:center">PHOTO</div>
          <div style="flex:1">
            <div class="row"><div class="k">Identity Card No.</div><div class="v">S8812345A</div></div>
            <div class="row"><div class="k">Name</div><div class="v">NUR AISYAH BINTE MOHD YUSOF</div></div>
            <div class="row"><div class="k">Race</div><div class="v">MALAY</div></div>
            <div class="row"><div class="k">Date of Birth</div><div class="v">15-03-1988</div></div>
            <div class="row"><div class="k">Sex</div><div class="v">F</div></div>
            <div class="row"><div class="k">Country of Birth</div><div class="v">SINGAPORE</div></div>
          </div>
        </div>
      </div>`),
  },

  // ── NRIC (Defendant) ──
  {
    name: 'nric-defendant',
    width: 660, height: 416,
    html: page(660, 416, `
      <div style="padding:26px 30px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:13px;letter-spacing:1px;color:#7a1f17">REPUBLIC OF SINGAPORE</div>
            <div style="font-size:15px;font-weight:700">IDENTITY CARD</div>
          </div>
          <div style="font-size:30px">🦁</div>
        </div>
        <div class="rule"></div>
        <div style="display:flex;gap:20px;margin-top:10px">
          <div style="width:120px;height:150px;background:#eee;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;color:#999;font-family:Arial;font-size:11px;text-align:center">PHOTO</div>
          <div style="flex:1">
            <div class="row"><div class="k">Identity Card No.</div><div class="v">S8534567B</div></div>
            <div class="row"><div class="k">Name</div><div class="v">AHMAD FADZILLAH BIN RAMLI</div></div>
            <div class="row"><div class="k">Race</div><div class="v">MALAY</div></div>
            <div class="row"><div class="k">Date of Birth</div><div class="v">22-07-1985</div></div>
            <div class="row"><div class="k">Sex</div><div class="v">M</div></div>
            <div class="row"><div class="k">Country of Birth</div><div class="v">SINGAPORE</div></div>
          </div>
        </div>
      </div>`),
  },

  // ── MCP completion certificate ──
  {
    name: 'mcp-certificate',
    width: 820, height: 620,
    html: page(820, 620, `
      <div style="padding:44px 56px">
        <div class="crest">⚖</div>
        <div class="gov" style="font-size:16px;font-weight:700;color:#7a1f17">SYARIAH COURT OF SINGAPORE</div>
        <div class="gov" style="font-size:12px">Marriage Counselling Programme (MCP)</div>
        <div class="rule"></div>
        <div style="text-align:center;font-size:18px;font-weight:700;margin:14px 0">CERTIFICATE OF COMPLETION</div>
        <div style="text-align:center;margin-bottom:16px">This certifies that <b>Nur Aisyah Binte Mohd Yusof (S8812345A)</b><br>has completed the mandatory Marriage Counselling Programme.</div>
        <div class="row"><div class="k">Provider</div><div class="v">Kadi Syariah Counselling Centre</div></div>
        <div class="row"><div class="k">Completion Date</div><div class="v">12 January 2026</div></div>
        <div class="row"><div class="k">Reference No.</div><div class="v">MCP/2026/00892</div></div>
        <div class="row"><div class="k">Valid Until</div><div class="v">15 July 2026</div></div>
        <div style="margin-top:40px;font-size:12px;color:#555">__________________________<br>Programme Coordinator</div>
      </div>`),
  },

  // ── Children's birth certificates (combined sheet) ──
  {
    name: 'birth-cert-children',
    width: 820, height: 1000,
    html: page(820, 1000, `
      <div style="padding:40px 56px">
        <div class="crest">🦁</div>
        <div class="gov" style="font-size:14px;color:#7a1f17">REPUBLIC OF SINGAPORE — IMMIGRATION &amp; CHECKPOINTS AUTHORITY</div>
        <div class="gov" style="font-size:16px;font-weight:700">BIRTH CERTIFICATE(S)</div>
        <div class="rule"></div>
        <div style="border:1px solid #ddd;border-radius:6px;padding:16px;margin-top:10px">
          <div style="font-weight:700;color:#7a1f17;margin-bottom:6px">CHILD 1</div>
          <div class="row"><div class="k">Name</div><div class="v">Muhammad Irfan Bin Ahmad Fadzillah</div></div>
          <div class="row"><div class="k">Birth Certificate No.</div><div class="v">T1234567A</div></div>
          <div class="row"><div class="k">Date of Birth</div><div class="v">03 May 2012</div></div>
          <div class="row"><div class="k">Sex</div><div class="v">Male</div></div>
          <div class="row"><div class="k">Citizenship</div><div class="v">Singapore Citizen</div></div>
          <div class="row"><div class="k">Father</div><div class="v">Ahmad Fadzillah Bin Ramli</div></div>
          <div class="row"><div class="k">Mother</div><div class="v">Nur Aisyah Binte Mohd Yusof</div></div>
        </div>
        <div style="border:1px solid #ddd;border-radius:6px;padding:16px;margin-top:16px">
          <div style="font-weight:700;color:#7a1f17;margin-bottom:6px">CHILD 2</div>
          <div class="row"><div class="k">Name</div><div class="v">Nur Insyirah Binte Ahmad Fadzillah</div></div>
          <div class="row"><div class="k">Birth Certificate No.</div><div class="v">T1456789B</div></div>
          <div class="row"><div class="k">Date of Birth</div><div class="v">17 November 2014</div></div>
          <div class="row"><div class="k">Sex</div><div class="v">Female</div></div>
          <div class="row"><div class="k">Citizenship</div><div class="v">Singapore Citizen</div></div>
          <div class="row"><div class="k">Father</div><div class="v">Ahmad Fadzillah Bin Ramli</div></div>
          <div class="row"><div class="k">Mother</div><div class="v">Nur Aisyah Binte Mohd Yusof</div></div>
        </div>
      </div>`),
  },

  // ── HDB statement ──
  {
    name: 'hdb-statement',
    width: 820, height: 700,
    html: page(820, 700, `
      <div style="padding:44px 56px">
        <div class="gov" style="font-size:18px;font-weight:700;color:#7a1f17">HOUSING &amp; DEVELOPMENT BOARD</div>
        <div class="gov" style="font-size:12px">Flat Particulars &amp; Outstanding Loan Statement</div>
        <div class="rule"></div>
        <div class="row"><div class="k">Flat Address</div><div class="v">Blk 342 Tampines Street 33, #08-145, Singapore 520342</div></div>
        <div class="row"><div class="k">Flat Type</div><div class="v">4-Room</div></div>
        <div class="row"><div class="k">Lease Commencement Year</div><div class="v">2011</div></div>
        <div class="row"><div class="k">Lessees</div><div class="v">Nur Aisyah Binte Mohd Yusof &amp; Ahmad Fadzillah Bin Ramli</div></div>
        <div class="row"><div class="k">Estimated Market Value</div><div class="v">SGD 620,000</div></div>
        <div class="row"><div class="k">Outstanding Housing Loan</div><div class="v">SGD 142,000</div></div>
        <div class="row"><div class="k">Monthly Instalment</div><div class="v">SGD 1,180</div></div>
        <div style="margin-top:30px;font-size:12px;color:#555">Statement generated for matrimonial proceedings.</div>
      </div>`),
  },

  // ── CPF statement ──
  {
    name: 'cpf-statement',
    width: 820, height: 640,
    html: page(820, 640, `
      <div style="padding:44px 56px">
        <div class="gov" style="font-size:18px;font-weight:700;color:#7a1f17">CENTRAL PROVIDENT FUND BOARD</div>
        <div class="gov" style="font-size:12px">Member Statement of Account</div>
        <div class="rule"></div>
        <div class="row"><div class="k">Member</div><div class="v">Nur Aisyah Binte Mohd Yusof (S8812345A)</div></div>
        <div class="row"><div class="k">Ordinary Account (OA)</div><div class="v">SGD 38,420.55</div></div>
        <div class="row"><div class="k">Special Account (SA)</div><div class="v">SGD 51,205.10</div></div>
        <div class="row"><div class="k">MediSave Account (MA)</div><div class="v">SGD 22,880.00</div></div>
        <div class="row"><div class="k">Amount Used for Housing</div><div class="v">SGD 96,500.00</div></div>
        <div style="margin-top:30px;font-size:12px;color:#555">As at 31 May 2026.</div>
      </div>`),
  },

  // ── Talak evidence note ──
  {
    name: 'talak-evidence',
    width: 820, height: 560,
    html: page(820, 560, `
      <div style="padding:44px 56px">
        <div class="gov" style="font-size:16px;font-weight:700;color:#7a1f17">STATUTORY DECLARATION — TALAK PRONOUNCEMENT</div>
        <div class="rule"></div>
        <div style="margin-top:10px;line-height:1.8">
          I, <b>Ahmad Fadzillah Bin Ramli (S8534567B)</b>, declare that on
          <b>05 March 2026</b> I pronounced talak upon my wife
          <b>Nur Aisyah Binte Mohd Yusof (S8812345A)</b>.
        </div>
        <div class="row" style="margin-top:14px"><div class="k">Date of Pronouncement</div><div class="v">05 March 2026</div></div>
        <div class="row"><div class="k">Mode</div><div class="v">Verbal (face-to-face)</div></div>
        <div class="row"><div class="k">Witness</div><div class="v">Ismail Bin Abdullah (S7012345C)</div></div>
        <div style="margin-top:40px;font-size:12px;color:#555">__________________________<br>Declarant signature</div>
      </div>`),
  },
];
