import type { Lang, RiskLevel } from "./types";
import { regionOverride } from "./species";

export const SYMPTOMS = [
  { id: "fever", en: "Fever", hi: "बुखार", mr: "ताप" },
  { id: "anorexia", en: "Reduced appetite", hi: "भूख कम होना", mr: "भूक कमी" },
  { id: "salivation", en: "Excessive salivation", hi: "अत्यधिक लार", mr: "जास्त लाळ" },
  { id: "mouth_lesions", en: "Mouth lesions", hi: "मुँह के छाले", mr: "तोंडातील फोड" },
  { id: "hoof_lesions", en: "Hoof lesions", hi: "खुर के घाव", mr: "खुरांवरील जखमा" },
  { id: "lameness", en: "Lameness", hi: "लंगड़ाहट", mr: "लंगडेपणा" },
  { id: "milk_drop", en: "Sudden milk drop", hi: "दूध अचानक घटना", mr: "दुधात अचानक घट" },
  { id: "respiratory", en: "Respiratory distress", hi: "साँस फूलना", mr: "श्वासत्रास" },
  { id: "throat_swelling", en: "Throat / neck swelling", hi: "गले में सूजन", mr: "गळ्याची सूज" },
  { id: "skin_nodules", en: "Skin nodules", hi: "त्वचा पर गाँठें", mr: "त्वचेवरील गाठी" },
  { id: "udder_swelling", en: "Udder swelling", hi: "थन में सूजन", mr: "कासेची सूज" },
  { id: "abnormal_milk", en: "Abnormal milk", hi: "दूध असामान्य", mr: "दूध असामान्य" },
  { id: "ticks", en: "Heavy ticks", hi: "अधिक किलनी", mr: "जास्त गोचिड" },
  { id: "lymph_nodes", en: "Swollen lymph nodes", hi: "लसीका ग्रंथि सूजन", mr: "लसिका गाठी सुजणे" },
  { id: "diarrhea", en: "Diarrhea", hi: "दस्त", mr: "जुलाब" },
  { id: "recumbency", en: "Unable to stand", hi: "खड़े नहीं हो पा रहे", mr: "उभे राहू शकत नाही" },
  { id: "muscle_swelling", en: "Limb muscle swelling", hi: "टाँग की मांसपेशी सूजन", mr: "पाय स्नायू सूज" },
  { id: "nasal_discharge", en: "Nasal discharge", hi: "नाक से स्राव", mr: "नाकातून स्राव" },
  { id: "depression", en: "Dullness", hi: "सुस्ती", mr: "सुस्तपणा" },
  { id: "weight_loss", en: "Weight loss", hi: "वजन घटना", mr: "वजन घट" },
  { id: "skin_redness", en: "Skin reddening / blotches", hi: "त्वचा पर लाल धब्बे", mr: "त्वचेवर लाल डाग" },
  { id: "neuro_signs", en: "Twisted neck / tremors", hi: "गर्दन मुड़ना / कंपन", mr: "मान वाकडी / थरथर" },
  { id: "egg_drop", en: "Drop in egg production", hi: "अंडा उत्पादन घटा", mr: "अंडी उत्पादनात घट" },
] as const;

export const REGIONS = [
  { id: "head", en: "Head", hi: "सिर", mr: "डोके" },
  { id: "eyes", en: "Eyes", hi: "आँखें", mr: "डोळे" },
  { id: "mouth", en: "Mouth", hi: "मुँह", mr: "तोंड" },
  { id: "neck", en: "Neck", hi: "गर्दन", mr: "मान" },
  { id: "respiratory", en: "Respiratory region", hi: "श्वसन क्षेत्र", mr: "श्वसन भाग" },
  { id: "skin", en: "Skin / body", hi: "त्वचा / शरीर", mr: "त्वचा / शरीर" },
  { id: "abdomen", en: "Abdomen", hi: "पेट", mr: "पोट" },
  { id: "udder", en: "Udder", hi: "थन", mr: "कास" },
  { id: "legs", en: "Legs", hi: "टाँगें", mr: "पाय" },
  { id: "hooves", en: "Hooves", hi: "खुर", mr: "खुर" },
] as const;

export type DiseaseId =
  | "fmd"
  | "hs"
  | "lsd"
  | "mastitis"
  | "theileriosis"
  | "bq"
  | "ppr"
  | "asf"
  | "newcastle"
  | "nonspecific";

export const DISEASE_SPECIES: Record<DiseaseId, string[]> = {
  fmd: ["cattle", "buffalo", "goat", "sheep", "pig"],
  hs: ["cattle", "buffalo"],
  lsd: ["cattle", "buffalo"],
  mastitis: ["cattle", "buffalo", "goat", "sheep", "camel"],
  theileriosis: ["cattle", "buffalo"],
  bq: ["cattle", "buffalo"],
  ppr: ["goat", "sheep"],
  asf: ["pig"],
  newcastle: ["poultry"],
  nonspecific: ["cattle", "buffalo", "goat", "sheep", "pig", "camel", "poultry"],
};

type Pack = { en: string; hi: string; mr: string };

export const NEXT_STEPS: Record<string, Pack> = {
  isolate: {
    en: "Separate the animal from the herd and stop movement off the farm.",
    hi: "पशु को झुंड से अलग रखें और खेत से बाहर आवाजाही रोकें।",
    mr: "जनावर कळपापासून वेगळे ठेवा आणि शेताबाहेर हालचाल थांबवा.",
  },
  call_vet: {
    en: "Contact the assigned veterinarian for a clinical examination today.",
    hi: "आज ही पशु चिकित्सक से नैदानिक जाँच करवाएँ।",
    mr: "आजच पशुवैद्यकाकडून नैदानिक तपासणी करून घ्या.",
  },
  sample: {
    en: "Collect epithelium / serum only through the veterinary-lab chain.",
    hi: "नमूना केवल पशु चिकित्सक–प्रयोगशाला श्रृंखला से लें।",
    mr: "नमुना फक्त पशुवैद्यक–प्रयोगशाळा साखळीतून घ्या.",
  },
  monitor_nearby: {
    en: "Check every animal on the farm and neighbouring sheds for the same pattern.",
    hi: "इसी पैटर्न के लिए खेत और पड़ोसी बाड़ों के सभी पशु देखें।",
    mr: "त्याच पद्धतीसाठी शेत आणि शेजारच्या गोठ्यातील सर्व जनावरे तपासा.",
  },
  notify_authority: {
    en: "Notify the taluka veterinary dispensary and district surveillance desk.",
    hi: "तालुका पशु चिकित्सालय और जिला निगरानी डेस्क को सूचित करें।",
    mr: "तालुका पशुवैद्यकीय दवाखाना आणि जिल्हा देखरेख कक्षाला कळवा.",
  },
  do_not_move: {
    en: "Do not take the animal to a market, fair, or common watering point.",
    hi: "पशु को बाज़ार, मेला या साझा पानी की जगह न ले जाएँ।",
    mr: "जनावर बाजार, जत्रा किंवा सामायिक पाणवठ्यावर नेऊ नका.",
  },
  supportive_care: {
    en: "Provide shade, clean water, and soft feed while awaiting the veterinarian.",
    hi: "पशु चिकित्सक के आने तक छाया, साफ पानी और मुलायम चारा दें।",
    mr: "पशुवैद्यक येईपर्यंत सावली, स्वच्छ पाणी आणि मऊ चारा द्या.",
  },
  udder_hygiene: {
    en: "Milk last, discard abnormal milk, and disinfect the cluster.",
    hi: "अंत में दूहें, असामान्य दूध फेंकें, और क्लस्टर कीटाणुरहित करें।",
    mr: "शेवटी दूध काढा, असामान्य दूध टाका आणि क्लस्टर निर्जंतुक करा.",
  },
  tick_control: {
    en: "Inspect ears, udder and tail switch; begin tick control after veterinary advice.",
    hi: "कान, थन और पूँछ की जाँच करें; किलनी नियंत्रण चिकित्सकीय सलाह के बाद करें।",
    mr: "कान, कास आणि शेपटी तपासा; गोचिड नियंत्रण पशुवैद्यकाच्या सल्ल्यानंतर करा.",
  },
  shade_rest: {
    en: "Keep the animal rested on soft bedding and limit walking.",
    hi: "पशु को नरम बिछावन पर आराम दें और चलना सीमित करें।",
    mr: "जनावर मऊ बिछावणीवर विश्रांती द्या आणि चालणे मर्यादित करा.",
  },
  separate_milk: {
    en: "Do not mix this animal's milk with the bulk tank until cleared.",
    hi: "क्लीयरेंस तक इस पशु का दूध बल्क टैंक में न मिलाएँ।",
    mr: "क्लिअरन्स होईपर्यंत या जनावरचे दूध बलक टाकीत मिसळू नका.",
  },
};

export const EVIDENCE_TEXT: Record<string, Pack> = {
  "symptom:fever": { en: "Fever reported", hi: "बुखार दर्ज", mr: "ताप नोंदवला" },
  "symptom:anorexia": { en: "Appetite is reduced", hi: "भूख कम है", mr: "भूक कमी आहे" },
  "symptom:salivation": { en: "Excessive salivation", hi: "अत्यधिक लार", mr: "जास्त लाळ" },
  "symptom:mouth_lesions": { en: "Mouth lesions described", hi: "मुँह के छाले बताए गए", mr: "तोंडातील फोड नोंदवले" },
  "symptom:hoof_lesions": { en: "Hoof lesions described", hi: "खुर के घाव बताए गए", mr: "खुरांवरील जखमा नोंदवल्या" },
  "symptom:lameness": { en: "Lameness / difficulty walking", hi: "चलने में कठिनाई", mr: "चालण्यात अडचण" },
  "symptom:milk_drop": { en: "Milk yield has dropped", hi: "दूध उत्पादन गिरा", mr: "दूध उत्पादन घटले" },
  "symptom:respiratory": { en: "Respiratory distress", hi: "साँस की तकलीफ", mr: "श्वासत्रास" },
  "symptom:throat_swelling": { en: "Throat or neck swelling", hi: "गले या गर्दन में सूजन", mr: "गळा किंवा मान सुजले" },
  "symptom:skin_nodules": { en: "Skin nodules reported", hi: "त्वचा पर गाँठें", mr: "त्वचेवरील गाठी" },
  "symptom:udder_swelling": { en: "Udder swelling", hi: "थन में सूजन", mr: "कास सुजले" },
  "symptom:abnormal_milk": { en: "Milk looks abnormal", hi: "दूध असामान्य", mr: "दूध असामान्य" },
  "symptom:ticks": { en: "Heavy tick burden", hi: "अधिक किलनी", mr: "जास्त गोचिड" },
  "symptom:lymph_nodes": { en: "Peripheral lymph nodes enlarged", hi: "लसीका ग्रंथियाँ सूजी", mr: "लसिका गाठी सुजल्या" },
  "symptom:diarrhea": { en: "Diarrhea", hi: "दस्त", mr: "जुलाब" },
  "symptom:recumbency": { en: "Animal is unwilling to stand", hi: "पशु खड़ा नहीं हो पा रहा", mr: "जनावर उभे राहत नाही" },
  "symptom:muscle_swelling": { en: "Painful limb muscle swelling", hi: "टाँग की मांसपेशी में दर्दनाक सूजन", mr: "पायाच्या स्नायूमध्ये दुखरी सूज" },
  "symptom:nasal_discharge": { en: "Nasal discharge", hi: "नाक से स्राव", mr: "नाकातून स्राव" },
  "symptom:depression": { en: "Dull, depressed demeanour", hi: "सुस्त व्यवहार", mr: "सुस्त वर्तन" },
  "symptom:weight_loss": { en: "Weight loss", hi: "वजन घटा", mr: "वजन घटले" },
  "region:mouth": { en: "Mouth region marked on the digital twin", hi: "डिजिटल ट्विन पर मुँह चिह्नित", mr: "डिजिटल ट्विनवर तोंड चिन्हांकित" },
  "region:hooves": { en: "Hooves marked on the digital twin", hi: "डिजिटल ट्विन पर खुर चिह्नित", mr: "डिजिटल ट्विनवर खुर चिन्हांकित" },
  "region:skin": { en: "Skin / body marked on the digital twin", hi: "त्वचा क्षेत्र चिह्नित", mr: "त्वचा भाग चिन्हांकित" },
  "region:udder": { en: "Udder marked on the digital twin", hi: "थन चिह्नित", mr: "कास चिन्हांकित" },
  "region:neck": { en: "Neck region marked", hi: "गर्दन चिह्नित", mr: "मान चिन्हांकित" },
  "region:respiratory": { en: "Respiratory region marked", hi: "श्वसन क्षेत्र चिह्नित", mr: "श्वसन भाग चिन्हांकित" },
  "region:legs": { en: "Legs marked", hi: "टाँगें चिह्नित", mr: "पाय चिन्हांकित" },
  "region:head": { en: "Head marked", hi: "सिर चिह्नित", mr: "डोके चिन्हांकित" },
  "region:eyes": { en: "Eyes marked", hi: "आँखें चिह्नित", mr: "डोळे चिन्हांकित" },
  "region:abdomen": { en: "Abdomen marked", hi: "पेट चिह्नित", mr: "पोट चिन्हांकित" },
  "photo:mouth": { en: "Photograph tagged to the mouth", hi: "मुँह का फोटो संलग्न", mr: "तोंडाचा फोटो जोडला" },
  "photo:hooves": { en: "Photograph tagged to the hooves", hi: "खुर का फोटो संलग्न", mr: "खुरांचा फोटो जोडला" },
  "photo:skin": { en: "Photograph tagged to the skin", hi: "त्वचा का फोटो संलग्न", mr: "त्वचेचा फोटो जोडला" },
  "photo:udder": { en: "Photograph tagged to the udder", hi: "थन का फोटो संलग्न", mr: "कासेचा फोटो जोडला" },
  vax_gap: { en: "Relevant vaccination is overdue or missing", hi: "संबंधित टीका अतिदेय या अनुपस्थित", mr: "संबंधित लस थकीत किंवा नाही" },
  vax_recent: { en: "Vaccine is on record — this lowers but does not remove risk", hi: "टीका दर्ज है — जोखिम घटता है, समाप्त नहीं", mr: "लस नोंद आहे — धोका कमी होतो, संपत नाही" },
  weather: { en: "Humidity and recent rain favour environmental persistence", hi: "नमी और हाल की बारिश वायरस को टिकाए रख सकती है", mr: "आर्द्रता आणि अलीकडील पाऊस टिकून राहण्यास अनुकूल" },
  mortality: { en: "Recent mortality has been reported nearby", hi: "आसपास हाल में मृत्यु दर्ज हुई है", mr: "जवळपास अलीकडे मृत्यू नोंदवला गेला" },
  nearby: { en: "Similar reports exist within 5 km", hi: "5 किमी के भीतर समान रिपोर्ट हैं", mr: "५ किमीच्या आत समान अहवाल आहेत" },
  history: { en: "This animal has a related condition in its history", hi: "इस पशु के इतिहास में संबंधित स्थिति है", mr: "या जनावरच्या इतिहासात संबंधित स्थिती आहे" },
};

export const DISEASES: Record<
  DiseaseId,
  {
    name: string;
    short: string;
    hi: string;
    mr: string;
    vaccine: string | null;
    steps: string[];
    advisory: Pack;
  }
> = {
  fmd: {
    name: "Foot-and-mouth disease",
    short: "FMD",
    hi: "खुरपका-मुँहपका",
    mr: "खुरपका-तोंडपाका",
    vaccine: "FMD",
    steps: ["isolate", "do_not_move", "call_vet", "sample", "monitor_nearby", "notify_authority", "supportive_care"],
    advisory: {
      en: "Possible foot-and-mouth pattern. This is not a diagnosis. Isolate the animal, avoid markets, and ask the veterinarian to examine mouth and feet and to arrange sampling. Watch every animal in the shed.",
      hi: "संभावित खुरपका-मुँहपका पैटर्न। यह निदान नहीं है। पशु को अलग रखें, बाज़ार न ले जाएँ, और पशु चिकित्सक से मुँह-खुर की जाँच व नमूना करवाएँ। बाड़े के हर पशु पर नज़र रखें।",
      mr: "संभाव्य खुरपका-तोंडपाका पद्धत. हा निदान नाही. जनावर वेगळे ठेवा, बाजाराला नेऊ नका, आणि पशुवैद्यकाकडून तोंड-खुर तपासणी व नमुना घेण्यास सांगा. गोठ्यातील प्रत्येक जनावर तपासा.",
    },
  },
  hs: {
    name: "Haemorrhagic septicaemia",
    short: "HS",
    hi: "गलघोंटू",
    mr: "गळसुजी",
    vaccine: "HS",
    steps: ["isolate", "call_vet", "notify_authority", "do_not_move", "supportive_care"],
    advisory: {
      en: "Possible haemorrhagic septicaemia pattern. This is not a diagnosis. High fever with throat swelling is an emergency — call the veterinarian immediately and do not move the animal.",
      hi: "संभावित गलघोंटू पैटर्न। यह निदान नहीं है। तेज बुखार और गले की सूजन आपात स्थिति है — तुरंत पशु चिकित्सक को बुलाएँ, पशु को न हिलाएँ।",
      mr: "संभाव्य गळसुजी पद्धत. हा निदान नाही. उच्च ताप आणि गळ्याची सूज आणीबाणी आहे — ताबडतोब पशुवैद्यकाला बोलावा, जनावर हलवू नका.",
    },
  },
  lsd: {
    name: "Lumpy skin disease",
    short: "LSD",
    hi: "लम्पी स्किन रोग",
    mr: "लम्पी स्किन आजार",
    vaccine: "LSD",
    steps: ["isolate", "call_vet", "monitor_nearby", "tick_control", "notify_authority"],
    advisory: {
      en: "Possible lumpy skin pattern. This is not a diagnosis. Separate the animal, control biting insects, and ask for a veterinary examination before any movement.",
      hi: "संभावित लम्पी स्किन पैटर्न। यह निदान नहीं है। पशु को अलग रखें, काटने वाले कीट नियंत्रित करें, और बिना जाँच आवाजाही न करें।",
      mr: "संभाव्य लम्पी स्किन पद्धत. हा निदान नाही. जनावर वेगळे ठेवा, चावणारे कीटक नियंत्रित करा, आणि तपासणीशिवाय हालचाल करू नका.",
    },
  },
  mastitis: {
    name: "Mastitis",
    short: "Mastitis",
    hi: "थनैला",
    mr: "कासदाह",
    vaccine: null,
    steps: ["call_vet", "udder_hygiene", "separate_milk", "supportive_care"],
    advisory: {
      en: "Possible mastitis. This is not a diagnosis. Milk this animal last, discard abnormal milk, and ask the veterinarian before using any intramammary medicine.",
      hi: "संभावित थनैला। यह निदान नहीं है। इस पशु को अंत में दूहें, असामान्य दूध फेंकें, और दवा से पहले पशु चिकित्सक से पूछें।",
      mr: "संभाव्य कासदाह. हा निदान नाही. या जनावरचे दूध शेवटी काढा, असामान्य दूध टाका, आणि औषधापूर्वी पशुवैद्यकाला विचारा.",
    },
  },
  theileriosis: {
    name: "Theileriosis",
    short: "Theileriosis",
    hi: "थिलीरियोसिस",
    mr: "थिलीरिओसिस",
    vaccine: null,
    steps: ["call_vet", "tick_control", "sample", "supportive_care"],
    advisory: {
      en: "Possible theileriosis, often linked with ticks. This is not a diagnosis. Request a blood smear and start tick control only as advised.",
      hi: "संभावित थिलीरियोसिस, अक्सर किलनी से जुड़ा। यह निदान नहीं है। रक्त स्मीयर करवाएँ और किलनी नियंत्रण सलाह के अनुसार करें।",
      mr: "संभाव्य थिलीरिओसिस, अनेकदा गोचिडींशी संबंधित. हा निदान नाही. रक्त स्मीअर करून घ्या आणि गोचिड नियंत्रण सल्ल्यानुसार करा.",
    },
  },
  bq: {
    name: "Black quarter",
    short: "BQ",
    hi: "एकंग / ब्लैक क्वार्टर",
    mr: "एकंग",
    vaccine: "BQ",
    steps: ["call_vet", "notify_authority", "shade_rest", "do_not_move", "isolate"],
    advisory: {
      en: "Possible black quarter. This is not a diagnosis. Sudden lameness with hot muscle swelling needs urgent veterinary attention. Do not massage the limb.",
      hi: "संभावित एकंग। यह निदान नहीं है। अचानक लंगड़ाहट और गर्म मांसपेशी सूजन में तुरंत चिकित्सक बुलाएँ। टाँग की मालिश न करें।",
      mr: "संभाव्य एकंग. हा निदान नाही. अचानक लंगडेपणा आणि गरम स्नायू सूजेसाठी तातडीने पशुवैद्यक बोलावा. पायाची मालिश करू नका.",
    },
  },
  ppr: {
    name: "Peste des petits ruminants",
    short: "PPR",
    hi: "पीपीआर / बकरी प्लेग",
    mr: "पीपीआर / शेळी प्लेग",
    vaccine: "PPR",
    steps: ["isolate", "call_vet", "sample", "monitor_nearby", "do_not_move", "notify_authority", "supportive_care"],
    advisory: {
      en: "Possible PPR pattern. This is not a diagnosis. Separate the goat or sheep, stop flock movement, and ask the veterinarian for swabs. Check every animal in the pen for nasal discharge and mouth sores.",
      hi: "संभावित पीपीआर पैटर्न। यह निदान नहीं है। बकरी/भेड़ को अलग रखें, झुंड की आवाजाही रोकें, और पशु चिकित्सक से स्वाब लेने को कहें।",
      mr: "संभाव्य पीपीआर पद्धत. हा निदान नाही. शेळी/मेंढी वेगळी ठेवा, कळपाची हालचाल थांबवा आणि पशुवैद्यकाकडून स्वॅब घ्या.",
    },
  },
  asf: {
    name: "African swine fever",
    short: "ASF",
    hi: "अफ्रीकी स्वाइन फीवर",
    mr: "आफ्रिकन स्वाइन फिव्हर",
    vaccine: null,
    steps: ["isolate", "do_not_move", "notify_authority", "call_vet", "sample", "monitor_nearby"],
    advisory: {
      en: "Possible African swine fever pattern. This is not a diagnosis. Do not move, sell or slaughter pigs. Keep visitors out of the sty and wait for the veterinary team.",
      hi: "संभावित अफ्रीकी स्वाइन फीवर पैटर्न। यह निदान नहीं है। सुअरों को न हिलाएँ, न बेचें, न काटें। बाड़े में बाहरी लोगों को न आने दें।",
      mr: "संभाव्य आफ्रिकन स्वाइन फिव्हर पद्धत. हा निदान नाही. डुकरे हलवू, विकू किंवा कापू नका. गोठ्यात बाहेरच्यांना येऊ देऊ नका.",
    },
  },
  newcastle: {
    name: "Newcastle disease",
    short: "ND",
    hi: "रानीखेत रोग",
    mr: "राणीखेत रोग",
    vaccine: "RD (Ranikhet)",
    steps: ["isolate", "call_vet", "sample", "monitor_nearby", "do_not_move"],
    advisory: {
      en: "Possible Newcastle (Ranikhet) pattern. This is not a diagnosis. Pen sick birds separately, stop selling birds and eggs from this flock, and ask the veterinarian about sampling and ring vaccination.",
      hi: "संभावित रानीखेत पैटर्न। यह निदान नहीं है। बीमार पक्षियों को अलग रखें, इस झुंड के पक्षी व अंडे बेचना रोकें।",
      mr: "संभाव्य राणीखेत पद्धत. हा निदान नाही. आजारी पक्षी वेगळे ठेवा, या कळपातील पक्षी व अंडी विकणे थांबवा.",
    },
  },
  nonspecific: {
    name: "Non-specific illness",
    short: "Non-specific",
    hi: "अविशिष्ट बीमारी",
    mr: "अविशिष्ट आजार",
    vaccine: null,
    steps: ["call_vet", "monitor_nearby", "supportive_care"],
    advisory: {
      en: "No single notifiable pattern is strong enough to name. This is not a diagnosis. Keep the animal under observation and ask a veterinarian if signs worsen.",
      hi: "कोई एक अधिसूचित पैटर्न इतना स्पष्ट नहीं है। यह निदान नहीं है। पशु को निगरानी में रखें और लक्षण बढ़ें तो चिकित्सक को बुलाएँ।",
      mr: "एकही अधिसूचित पद्धत पुरेशी स्पष्ट नाही. हा निदान नाही. जनावर निरीक्षणात ठेवा आणि लक्षणे वाढल्यास पशुवैद्यकाला बोलावा.",
    },
  },
};

export function pack(lang: Lang, item: Pack) {
  return item[lang] || item.en;
}

export function symptomLabel(id: string, lang: Lang) {
  const row = SYMPTOMS.find((s) => s.id === id);
  if (!row) return id;
  return row[lang] || row.en;
}

export function regionLabel(id: string, lang: Lang, species?: string) {
  if (species) {
    const o = regionOverride(species, id, lang);
    if (o) return o;
  }
  const row = REGIONS.find((s) => s.id === id);
  if (!row) return id;
  return row[lang] || row.en;
}

export function diseaseLabel(id: string, lang: Lang) {
  const d = DISEASES[id as DiseaseId];
  if (!d) return id;
  if (lang === "hi") return d.hi;
  if (lang === "mr") return d.mr;
  return d.name;
}

export function riskLabel(risk: RiskLevel, lang: Lang) {
  const map: Record<RiskLevel, Pack> = {
    low: { en: "Low", hi: "कम", mr: "कमी" },
    moderate: { en: "Moderate", hi: "मध्यम", mr: "मध्यम" },
    high: { en: "High", hi: "उच्च", mr: "उच्च" },
    critical: { en: "Critical", hi: "गंभीर", mr: "गंभीर" },
  };
  return pack(lang, map[risk]);
}

export const STATUS_PACK: Record<string, Pack> = {
  healthy: { en: "Healthy", hi: "स्वस्थ", mr: "निरोगी" },
  observation: { en: "Under Observation", hi: "निगरानी में", mr: "निरीक्षणाखाली" },
  suspected: { en: "Suspected", hi: "संदिग्ध", mr: "संशयित" },
  confirmed: { en: "Confirmed", hi: "पुष्टि", mr: "निश्चित" },
  recovering: { en: "Recovering", hi: "स्वस्थ हो रहा है", mr: "बरे होत आहे" },
  deceased: { en: "Deceased", hi: "मृत", mr: "मृत" },
};

export function statusLabel(status: string, lang: Lang) {
  return pack(lang, STATUS_PACK[status] || { en: status, hi: status, mr: status });
}

export const CASE_STATUS_PACK: Record<string, Pack> = {
  reported: { en: "Reported", hi: "रिपोर्ट", mr: "अहवाल" },
  triaged: { en: "Triaged", hi: "ट्राइएज", mr: "ट्राइएज" },
  assigned: { en: "Assigned", hi: "सौंपा गया", mr: "नेमणूक" },
  examined: { en: "Examined", hi: "जाँच हुई", mr: "तपासणी" },
  sampled: { en: "Sampled", hi: "नमूना लिया", mr: "नमुना" },
  tested: { en: "Tested", hi: "परीक्षित", mr: "चाचणी" },
  confirmed: { en: "Confirmed", hi: "पुष्टि", mr: "निश्चित" },
  rejected: { en: "Rejected", hi: "अस्वीकृत", mr: "नाकारले" },
  treated: { en: "Treated", hi: "उपचार जारी", mr: "उपचार सुरू" },
  closed: { en: "Closed", hi: "बंद", mr: "बंद" },
};

export const SAMPLE_STATUS_PACK: Record<string, Pack> = {
  collected: { en: "Collected", hi: "एकत्रित", mr: "गोळा" },
  in_transit: { en: "In transit", hi: "रास्ते में", mr: "वाटेत" },
  received: { en: "Received", hi: "प्राप्त", mr: "प्राप्त" },
  testing: { en: "Testing", hi: "परीक्षण", mr: "चाचणी" },
  result_available: { en: "Result available", hi: "परिणाम उपलब्ध", mr: "निकाल उपलब्ध" },
};
