export const SAMPLE_PHRASE =
  "Cow ko bukhar hai aur khana nahi kha rahi. Muh se laar aa rahi hai aur langda kar rahi hai.";

export function speechLang(lang: string = "en") {
  if (lang === "hi") return "hi-IN";
  if (lang === "mr") return "mr-IN";
  return "en-IN";
}

export type VoiceScript = {
  text: string; // Devanagari for hi/mr, English for en
  romanized: string; // Roman phonetic for fallback when OS lacks Hindi/Marathi TTS
  display: string; // Clean text for UI subtitles
};

// Known disease names across languages and phonetic romanization
const DISEASE_NAMES: Record<string, { en: string; hi: string; mr: string; hi_rom: string; mr_rom: string }> = {
  fmd: {
    en: "Foot and Mouth Disease",
    hi: "मुँहपका-खुरपका रोग",
    mr: "लाळ्या खुरकूत आजार",
    hi_rom: "muh-paka khur-paka rog",
    mr_rom: "lalya khurkut aajar",
  },
  hs: {
    en: "Hemorrhagic Septicemia",
    hi: "गलघोंटू रोग",
    mr: "घटसर्प आजार",
    hi_rom: "galghontu rog",
    mr_rom: "ghatsarpa aajar",
  },
  lsd: {
    en: "Lumpy Skin Disease",
    hi: "लम्पी त्वचा रोग",
    mr: "लम्पी चर्मरोग",
    hi_rom: "lumpy twacha rog",
    mr_rom: "lumpy charmarog",
  },
  mastitis: {
    en: "Mastitis",
    hi: "थनैला रोग",
    mr: "स्तनदाह (मस्टायटिस)",
    hi_rom: "thanaila rog",
    mr_rom: "stanadah",
  },
  theileriosis: {
    en: "Theileriosis",
    hi: "थायलेरिया रोग",
    mr: "थायलेरिओसिस आजार",
    hi_rom: "theileria rog",
    mr_rom: "theileriosis",
  },
  bq: {
    en: "Blackquarter",
    hi: "लंगड़ा बुखार",
    mr: "फाऱ्या आजार",
    hi_rom: "langda bukhar",
    mr_rom: "pharya",
  },
  ppr: {
    en: "PPR (Goat Plague)",
    hi: "बकरी प्लेग",
    mr: "बकऱ्यांचा प्लेग",
    hi_rom: "bakri plague (PPR)",
    mr_rom: "bakryancha plague",
  },
};

function matchDisease(condition?: string | null) {
  if (!condition) return null;
  const c = condition.toLowerCase();
  for (const [k, v] of Object.entries(DISEASE_NAMES)) {
    if (c.includes(k) || c.includes(v.en.toLowerCase()) || c.includes(v.hi) || c.includes(v.mr)) {
      return v;
    }
  }
  return {
    en: condition,
    hi: condition,
    mr: condition,
    hi_rom: condition,
    mr_rom: condition,
  };
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      window.dispatchEvent(
        new CustomEvent("praana:speech", {
          detail: { active: false, text: "", lang: "en" },
        })
      );
    } catch {
      // ignore
    }
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Finds the best available browser TTS voice for the target language.
 * Falls back to Indian English or system default if Hindi/Marathi is not installed.
 */
function pickVoice(lang: string): { voice: SpeechSynthesisVoice | null; isNative: boolean } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { voice: null, isNative: false };
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return { voice: null, isNative: false };
  }

  const langCode = lang.toLowerCase();

  if (langCode === "hi") {
    // 1. Exact Hindi voice match
    const hiVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("hi") ||
        v.name.toLowerCase().includes("hindi") ||
        v.name.toLowerCase().includes("kalpana") ||
        v.name.toLowerCase().includes("hemant")
    );
    if (hiVoice) return { voice: hiVoice, isNative: true };
  }

  if (langCode === "mr") {
    // 1. Marathi voice match
    const mrVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("mr") ||
        v.name.toLowerCase().includes("marathi")
    );
    if (mrVoice) return { voice: mrVoice, isNative: true };

    // 2. Hindi voice can speak Marathi Devanagari phonemes perfectly
    const hiFallback = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("hi") ||
        v.name.toLowerCase().includes("hindi")
    );
    if (hiFallback) return { voice: hiFallback, isNative: true };
  }

  // 3. Indian English voice (reads Romanized Hindi/Marathi and English with native cadence)
  const inVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().replace("_", "-") === "en-in" ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("heera") ||
      v.name.toLowerCase().includes("ravi") ||
      v.name.toLowerCase().includes("neerja")
  );
  if (inVoice) {
    return { voice: inVoice, isNative: langCode === "en" };
  }

  // 4. Default voice
  const defaultVoice = voices.find((v) => v.default) || voices[0] || null;
  return { voice: defaultVoice, isNative: langCode === "en" };
}

/**
 * Universal speech player: Handles Devanagari if native TTS is present,
 * or phonetic Romanized speech if OS only has English TTS.
 */
export function speakText(
  input: string | VoiceScript,
  lang: string = "en",
  onEnd?: () => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    // Prepare speech and display strings
    let nativeText = "";
    let romanizedText = "";
    let displayText = "";

    if (typeof input === "string") {
      nativeText = input;
      romanizedText = input;
      displayText = input;
    } else {
      nativeText = input.text;
      romanizedText = input.romanized || input.text;
      displayText = input.display || input.text;
    }

    const { voice, isNative } = pickVoice(lang);

    // If Hindi/Marathi voice is installed, speak Devanagari.
    // Otherwise, speak Romanized phonetics so English voices pronounce it legibly!
    const textToSpeak = isNative || lang === "en" ? nativeText : romanizedText;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = speechLang(lang);
    }

    utterance.rate = 0.92; // Clear, measured pace
    utterance.pitch = 1.0;

    // Broadcast visual caption event for UI subtitles
    window.dispatchEvent(
      new CustomEvent("praana:speech", {
        detail: { active: true, text: displayText, lang },
      })
    );

    const finish = () => {
      window.dispatchEvent(
        new CustomEvent("praana:speech", {
          detail: { active: false, text: "", lang },
        })
      );
      if (onEnd) onEnd();
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      finish();
    };

    // Chrome workaround: Short delay after cancel to prevent instant cancellation
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 45);

    return true;
  } catch (err) {
    console.error("Speech synthesis failed:", err);
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Builds rich, tri-lingual animal briefing with Devanagari & Romanized fallback.
 */
export function generateAnimalNarrative({
  name,
  species,
  breed,
  status,
  riskLevel,
  suspectedCondition,
  confirmedCondition,
  affectedRegions = [],
  lang = "en",
}: {
  name: string;
  species: string;
  breed: string;
  status: string;
  riskLevel: string;
  suspectedCondition?: string | null;
  confirmedCondition?: string | null;
  affectedRegions?: string[];
  lang?: string;
}): VoiceScript {
  const dMatch = matchDisease(confirmedCondition || suspectedCondition);
  const regionsList = affectedRegions.join(", ");

  if (lang === "hi") {
    const disName = dMatch ? dMatch.hi : suspectedCondition || "जांच जारी";
    const disRom = dMatch ? dMatch.hi_rom : suspectedCondition || "jaanch jaari";
    const native = `ध्यान दें: ${name} (${breed} ${species}) की स्वास्थ्य रिपोर्ट। सद्य स्थिति ${status} है और जोखिम स्तर ${riskLevel} है। संभावित बीमारी: ${disName}। प्रभावित अंग: ${regionsList || "कोई नहीं"}। कृपया पशु को अलग रखें और तुरंत 1962 पर कॉल करें।`;
    const romanized = `Dhyan dein: ${name} (${breed} ${species}) ki swasthya report. Sthiti ${status} hai aur risk level ${riskLevel} hai. Sambhavit bimari: ${disRom}. Prabhavit ang: ${regionsList || "koi nahi"}. Kripya pashu ko alag rakhein aur turant 1962 par call karein.`;
    return { text: native, romanized, display: native };
  }

  if (lang === "mr") {
    const disName = dMatch ? dMatch.mr : suspectedCondition || "तपासणी सुरू";
    const disRom = dMatch ? dMatch.mr_rom : suspectedCondition || "tapasani suru";
    const native = `लक्ष द्या: ${name} (${breed} ${species}) चा आरोग्य अहवाल। सद्यस्थिती ${status} असून जोखीम पातळी ${riskLevel} आहे। संशयित आजार: ${disName}। बाधित भाग: ${regionsList || "काही नाही"}। कृपया जनावरास इतर जनावरांपासून वेगळे ठेवा व 1962 वर संपर्क साधा।`;
    const romanized = `Laksha dya: ${name} (${breed} ${species}) cha arogya ahwal. Sadyasthiti ${status} asun jokhim patali ${riskLevel} ahe. Sanshayit aajar: ${disRom}. Badhit bhaag: ${regionsList || "kahi nahi"}. Kripya janavaras itar janavaranpasun vegale theva va 1962 var sampark sadha.`;
    return { text: native, romanized, display: native };
  }

  const disName = dMatch ? dMatch.en : confirmedCondition || suspectedCondition || "Under observation";
  const text = `Health briefing for ${name}, a ${breed} ${species}. Current status is ${status} with ${riskLevel} risk level. Assessment indicates ${disName}. Affected body parts include: ${regionsList || "none marked"}. Please isolate this animal and follow veterinary containment advice.`;
  return { text, romanized: text, display: text };
}

/**
 * Builds regional body part narration for 3D clicks.
 */
export function generateRegionNarrative({
  regionName,
  isAffected,
  notes,
  lang = "en",
}: {
  regionName: string;
  isAffected: boolean;
  notes?: string;
  lang?: string;
}): VoiceScript {
  if (lang === "hi") {
    if (isAffected) {
      const native = `${regionName}: लक्षण पाए गए हैं। ${notes || "छाले, सूजन या घाव की जांच की जा रही है।"}`;
      const romanized = `${regionName}: lakshan paaye gaye hain. ${notes || "chhale, soojan ya ghaav ki jaanch ki jaa rahi hai."}`;
      return { text: native, romanized, display: native };
    }
    const native = `${regionName}: सामान्य स्थिति। कोई घाव या लक्षण नहीं मिला।`;
    const romanized = `${regionName}: samanya sthiti. Koi ghaav ya lakshan nahi mila.`;
    return { text: native, romanized, display: native };
  }

  if (lang === "mr") {
    if (isAffected) {
      const native = `${regionName}: लक्षणे आढळली आहेत। ${notes || "फोड, सूज किंवा जखमांची तपासणी सुरू आहे।"}`;
      const romanized = `${regionName}: lakshane aadhalli ahet. ${notes || "phod, sooj kiva jakhmanchi tapasani suru ahe."}`;
      return { text: native, romanized, display: native };
    }
    const native = `${regionName}: सामान्य स्थिती। कोणतीही लक्षणे नाहीत।`;
    const romanized = `${regionName}: samanya sthiti. Kontehi lakshan nahi.`;
    return { text: native, romanized, display: native };
  }

  if (isAffected) {
    const text = `${regionName}: Clinical signs detected. ${notes || "Sores, swelling, or lesions under active observation."}`;
    return { text, romanized: text, display: text };
  }
  const text = `${regionName}: Nominal. No active lesions reported.`;
  return { text, romanized: text, display: text };
}

/**
 * Builds triage advice narrative for post-report advisory screen.
 */
export function generateTriageNarrative({
  condition,
  riskLevel,
  nextSteps = [],
  lang = "en",
}: {
  condition: string;
  riskLevel: string;
  nextSteps?: string[];
  lang?: string;
}): VoiceScript {
  const dMatch = matchDisease(condition);
  const steps = nextSteps.slice(0, 3).join(", ");

  if (lang === "hi") {
    const cName = dMatch ? dMatch.hi : condition;
    const cRom = dMatch ? dMatch.hi_rom : condition;
    const native = `ट्राइएज रिपोर्ट: संभावित बीमारी ${cName} है। जोखिम स्तर ${riskLevel} है। अगले जरूरी कदम: ${steps || "पशु को अलग रखें, दूध न बेचें, और तुरंत 1962 पर कॉल करें।"}`;
    const romanized = `Triage report: Sambhavit bimari ${cRom} hai. Risk level ${riskLevel} hai. Agle zaroori kadam: ${steps || "Pashu ko alag rakhein, doodh na bechein, aur turant 1962 par call karein."}`;
    return { text: native, romanized, display: native };
  }

  if (lang === "mr") {
    const cName = dMatch ? dMatch.mr : condition;
    const cRom = dMatch ? dMatch.mr_rom : condition;
    const native = `ट्राइएज अहवाल: संशयित आजार ${cName} आहे। जोखीम पातळी ${riskLevel} आहे। पुढील पायऱ्या: ${steps || "जनावरास वेगळे ठेवा, दूध विकू नका, आणि त्वरित 1962 वर संपर्क साधा।"}`;
    const romanized = `Triage ahwal: Sanshayit aajar ${cRom} ahe. Jokhim patali ${riskLevel} ahe. Pudhil payarya: ${steps || "Janavaras vegale theva, doodh viku naka, aani 1962 var sampark sadha."}`;
    return { text: native, romanized, display: native };
  }

  const cName = dMatch ? dMatch.en : condition;
  const text = `Triage assessment: Possible ${cName} with ${riskLevel} risk level. Next recommended actions: ${steps || "Quarantine animal, do not sell milk, and request immediate veterinary visit."}`;
  return { text, romanized: text, display: text };
}

/**
 * Builds doctor assignment & withdrawal warning narrative.
 */
export function generateDoctorAdvisory({
  doctorName,
  caseCode,
  animalName,
  medicine,
  lang = "en",
}: {
  doctorName?: string | null;
  caseCode?: string | null;
  animalName: string;
  medicine?: string | null;
  lang?: string;
}): VoiceScript {
  const doc = doctorName || "District Veterinary Officer";
  const cCode = caseCode || "";

  if (medicine) {
    if (lang === "hi") {
      const native = `सावधान: ${animalName} को दवा ${medicine} दी जा रही है। एंटीबायोटिक का असर दूध में आता है। दवा के दौरान और अंतिम खुराक के बहत्तर घंटे बाद तक दूध का उपयोग या बिक्री बिल्कुल न करें।`;
      const romanized = `Savdhan: ${animalName} ko dawa ${medicine} di jaa rahi hai. Antibiotic ka asar doodh mein aata hai. Dawa ke dauran aur aakhri khurak ke 72 ghante baad tak doodh ka upyog ya bikri bilkul na karein.`;
      return { text: native, romanized, display: native };
    }
    if (lang === "mr") {
      const native = `सावधान: ${animalName} ला ${medicine} हे औषध सुरू आहे। अँटीबायोटिकचे अंश दुधात उतरतात। औषध सुरू असताना आणि शेवटच्या डोसनंतर बहात्तर तास दूध पिऊ किंवा विकू नका।`;
      const romanized = `Savdhan: ${animalName} la ${medicine} he aushadh suru ahe. Antibiotic che ansh dudhat utartat. Aushadh suru astana aani shevatachya dose nantar 72 taas doodh piu kiva viku naka.`;
      return { text: native, romanized, display: native };
    }
    const text = `Warning: ${animalName} is on active medication ${medicine}. Antibiotic residues pass into milk. Do not consume or sell milk during medication and for 72 hours after the final dose.`;
    return { text, romanized: text, display: text };
  }

  if (lang === "hi") {
    const native = `केस ${cCode}: पशु चिकित्सक ${doc} इस केस की देखरेख कर रहे हैं। पशु को अलग शेड में रखें। आपातकाल के लिए 1962 डायल करें।`;
    const romanized = `Case ${cCode}: Pashu chikitsak ${doc} is case ki dekhrekh kar rahe hain. Pashu ko alag shed mein rakhein. Aapatkaal ke liye 1962 dial karein.`;
    return { text: native, romanized, display: native };
  }
  if (lang === "mr") {
    const native = `केस ${cCode}: पशुवैद्यकीय अधिकारी ${doc} या केसची तपासणी करत आहेत। जनावरास वेगळ्या गोठ्यात ठेवा। आपत्कालीन मदतीसाठी 1962 डायल करा।`;
    const romanized = `Case ${cCode}: Pashuvaidyakiya adhikari ${doc} ya casechi tapasani karat ahet. Janavaras veglya gothhyat theva. Aapatkalin madatisathi 1962 dial kara.`;
    return { text: native, romanized, display: native };
  }

  const text = `Case ${cCode}: Veterinary Doctor ${doc} is assigned to ${animalName}. Maintain strict stall isolation and dial 1962 for immediate emergency support.`;
  return { text, romanized: text, display: text };
}
