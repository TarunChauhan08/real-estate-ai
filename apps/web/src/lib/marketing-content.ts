import { type PhotoKey } from './images';

/**
 * Content for the public solution pages and guides.
 *
 * SEO principles behind it:
 * - One page per search intent (WhatsApp AI, builders, brokers, lead management, Hindi/Hinglish),
 *   each with its own title, description, H1 and FAQ — not one page trying to rank for everything.
 * - Written for people first: specific, plain-language, Indian context (portals, WhatsApp, RERA,
 *   Hinglish). Every claim describes what the product actually does today.
 * - No invented statistics, customers or reviews. Search engines and buyers both punish that.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface SolutionPage {
  slug: string;
  /** Short label for navigation and related links. */
  label: string;
  /** <title>, ≤ 60 characters. */
  title: string;
  /** Meta description, ≤ 155 characters. */
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  photo: PhotoKey;
  problem: { heading: string; points: Array<{ title: string; body: string }> };
  how: { heading: string; steps: Array<{ title: string; body: string }> };
  features: { heading: string; items: Array<{ title: string; body: string }> };
  faq: FaqItem[];
  related: string[];
}

export const SOLUTIONS: SolutionPage[] = [
  {
    slug: 'whatsapp-ai-for-real-estate',
    label: 'WhatsApp AI for real estate',
    title: 'WhatsApp AI for Real Estate in India | Reply in Seconds',
    description:
      'An AI agent on your official WhatsApp Business number that answers property enquiries in Hindi, English and Hinglish, qualifies buyers and suggests your listings.',
    eyebrow: 'WhatsApp AI for real estate',
    h1: 'WhatsApp AI that answers every property enquiry in seconds',
    intro:
      'Most Indian buyers enquire on WhatsApp — from portal listings, Click-to-WhatsApp ads and the number on your hoarding. Our AI sales agent replies on your official WhatsApp Business number, day and night, in the language the buyer writes in. It asks the right questions, recommends only your real inventory and hands serious buyers to your team.',
    photo: 'phone',
    problem: {
      heading: 'Why WhatsApp enquiries slip away',
      points: [
        {
          title: 'Replies come hours later',
          body: 'Enquiries arrive at 11 pm, during site visits and on Sundays. By the time someone replies, the buyer has messaged three other numbers.',
        },
        {
          title: 'Everyone asks the same five questions',
          body: '“Budget kitna hai? Kaunsa sector? 2 BHK ya 3?” Your team repeats them all day on personal phones, and the answers live in chat history, not in a CRM.',
        },
        {
          title: 'Basic chatbots frustrate buyers',
          body: 'Button menus cannot handle “Noida extension mein ready to move 3 BHK, 85 tak” — so buyers give up or type “agent”.',
        },
      ],
    },
    how: {
      heading: 'How the WhatsApp AI works',
      steps: [
        {
          title: 'Connect your official number',
          body: 'Use the WhatsApp Business (Cloud) API from Meta. Your token is checked with WhatsApp and stored encrypted.',
        },
        {
          title: 'Buyers message you as usual',
          body: 'A lead is created from their number and WhatsApp name. The AI replies within seconds, in Hindi, English or Hinglish.',
        },
        {
          title: 'The AI qualifies and recommends',
          body: 'It learns budget, location, BHK, timeline and home-loan need in conversation, scores the lead and suggests matching listings from your inventory only.',
        },
        {
          title: 'Your team takes over when it matters',
          body: 'Discounts, legal questions and complaints are handed to a person. Anyone on your team can pause the AI and reply on WhatsApp from the shared inbox.',
        },
      ],
    },
    features: {
      heading: 'Built for how WhatsApp really works',
      items: [
        {
          title: 'Official API, not a workaround',
          body: 'Runs on Meta’s WhatsApp Business Platform, so your number is not at risk of being banned for automation.',
        },
        {
          title: 'One shared inbox',
          body: 'Every chat, with delivery ticks, in one place. Managers see what the AI said and what the team said.',
        },
        {
          title: 'Respects the 24-hour rule',
          body: 'WhatsApp allows free replies for 24 hours after the buyer’s last message. The inbox shows the time left, so nobody hits a wall.',
        },
        {
          title: 'One answer, not five',
          body: 'Buyers often send “hi”, “3 BHK”, “Noida” as three messages. The AI waits a moment and answers them together.',
        },
        {
          title: 'Never invents a flat or a price',
          body: 'It only knows the listings you add. If nothing fits, it says so and asks what the buyer can adjust.',
        },
        {
          title: 'Every reply on record',
          body: 'An audit trail records each change the AI makes to a lead, so you can always see why.',
        },
      ],
    },
    faq: [
      {
        q: 'Do I need the WhatsApp Business API, or does the normal WhatsApp Business app work?',
        a: 'You need the WhatsApp Business Platform (Cloud API) from Meta. The phone app cannot be automated safely. You keep your own number and display name.',
      },
      {
        q: 'Will the AI reply in Hinglish?',
        a: 'Yes. It mirrors the buyer: Roman Hinglish gets a Hinglish reply, Devanagari Hindi gets Hindi, and English gets English.',
      },
      {
        q: 'Can my sales team still chat with buyers?',
        a: 'Yes. Anyone on your team can pause the AI for a conversation and reply from the inbox. The message goes out from your business number.',
      },
      {
        q: 'Can it send messages to buyers who wrote more than a day ago?',
        a: 'WhatsApp only allows free-form replies within 24 hours of the buyer’s last message. After that, Meta requires pre-approved template messages, which we are adding next.',
      },
      {
        q: 'Can I try it before connecting WhatsApp?',
        a: 'Yes. A demo mode lets you send pretend WhatsApp messages as a buyer and watch the AI, the lead and the inbox update — before going through Meta’s setup.',
      },
    ],
    related: ['hindi-hinglish-ai-for-real-estate', 'real-estate-lead-management'],
  },
  {
    slug: 'ai-for-real-estate-builders-developers',
    label: 'For builders & developers',
    title: 'AI Sales Agent for Real Estate Builders & Developers in India',
    description:
      'Handle launch-day enquiry spikes with an AI sales agent that answers every buyer, qualifies them against your projects and gives your pre-sales team ready leads.',
    eyebrow: 'For builders and developers',
    h1: 'An AI pre-sales team for builders and developers',
    intro:
      'A launch, a newspaper ad or a portal campaign can bring hundreds of enquiries in a day — far more than a pre-sales team can answer in time. Our AI sales agent replies to every one of them, learns what each buyer needs, recommends the right unit from your available inventory and sends only qualified buyers to your sales managers.',
    photo: 'towers',
    problem: {
      heading: 'Where launch enquiries leak',
      points: [
        {
          title: 'Spikes your team cannot absorb',
          body: 'Enquiries peak in the evening and on weekends, exactly when callers are off. Leads cool down in the queue.',
        },
        {
          title: 'Hot buyers look like everyone else',
          body: 'An investor ready to book this month waits behind a casual browser because nobody has asked the qualifying questions yet.',
        },
        {
          title: 'Wrong information costs trust',
          body: 'Quoting a sold-out unit or a wrong possession date damages trust and creates compliance risk under RERA.',
        },
      ],
    },
    how: {
      heading: 'From enquiry to qualified buyer',
      steps: [
        {
          title: 'Load your inventory',
          body: 'Add projects and units with price, configuration, carpet area, possession status and RERA number. Mark sold units unavailable.',
        },
        {
          title: 'The AI answers instantly',
          body: 'On WhatsApp or in a web chat, in Hindi, English or Hinglish — with the same polite, on-brand tone every time.',
        },
        {
          title: 'It qualifies and scores',
          body: 'Budget, preferred tower or configuration, timeline, self-use or investment, and loan need land on the lead automatically. Leads are scored hot, warm or cold.',
        },
        {
          title: 'Sales managers get ready leads',
          body: 'Assign leads to managers, move them through stages to “won”, and read every conversation before the call.',
        },
      ],
    },
    features: {
      heading: 'Made for project sales',
      items: [
        {
          title: 'Only available inventory',
          body: 'The AI sees units marked available and matches them to the buyer’s budget and configuration. It never invents a unit or an offer.',
        },
        {
          title: 'RERA-safe answers',
          body: 'It never makes up possession dates, prices or RERA numbers, and never promises returns or loan approval.',
        },
        {
          title: 'Discounts go to people',
          body: 'Price negotiation, legal and document questions are handed to your team automatically, with the AI paused.',
        },
        {
          title: 'Roles for large teams',
          body: 'Owners, admins, managers, sales agents and viewers each see only what they should, enforced on the server.',
        },
        {
          title: 'Audit trail',
          body: 'Every lead change is logged — by whom, when and, for the AI, in which conversation.',
        },
        {
          title: 'On-premise option',
          body: 'Built so larger developers can host it on their own servers when data must stay in-house.',
        },
      ],
    },
    faq: [
      {
        q: 'Can it handle many projects in different cities?',
        a: 'Yes. Add every project and unit; the AI matches buyers on city, locality, configuration and budget, and relaxes the match step by step if nothing fits exactly.',
      },
      {
        q: 'Will it quote prices?',
        a: 'Only the prices you have entered for available units. It will not negotiate or offer discounts — those requests go to your team.',
      },
      {
        q: 'Does it work with channel partners?',
        a: 'Channel partners can be added to your team with limited roles, so they work leads without seeing everything.',
      },
      {
        q: 'Can we keep our data on our own servers?',
        a: 'The platform is designed for an on-premise deployment for developers who need it. Talk to us about your requirements.',
      },
    ],
    related: ['real-estate-lead-management', 'whatsapp-ai-for-real-estate'],
  },
  {
    slug: 'ai-for-real-estate-brokers',
    label: 'For brokers & agents',
    title: 'AI Assistant for Real Estate Brokers & Agents in India',
    description:
      'An AI assistant for brokers that answers buyer and tenant enquiries 24×7 on WhatsApp, shares matching listings and keeps every lead organised — in Hinglish too.',
    eyebrow: 'For brokers and agents',
    h1: 'An AI assistant for real estate brokers that never misses a lead',
    intro:
      'As a broker you are on site visits, in traffic or with a client when the next enquiry arrives. Our AI assistant answers every buyer and tenant for you — on WhatsApp or web chat — asks what they need, shares matching listings from your own inventory and keeps the details on a clean lead card, so you call back already knowing the requirement.',
    photo: 'keys',
    problem: {
      heading: 'A broker’s day, without help',
      points: [
        {
          title: 'You cannot reply while showing a flat',
          body: 'The enquiry you ignore during a visit is often the one that would have closed.',
        },
        {
          title: 'Requirements get lost in chats',
          body: 'Budget, area and BHK are scattered across WhatsApp threads, notes and memory.',
        },
        {
          title: 'Rentals and sales need different answers',
          body: 'Tenants and buyers ask different questions; the wrong listing wastes everyone’s time.',
        },
      ],
    },
    how: {
      heading: 'How it works for a brokerage',
      steps: [
        {
          title: 'Add your listings',
          body: 'Sale or rent, with locality, BHK, area and price. Archive them when they are gone.',
        },
        {
          title: 'The AI talks to every enquiry',
          body: 'It replies in the buyer’s language, asks the qualifying questions and suggests only listings that match.',
        },
        {
          title: 'You get a ready lead',
          body: 'Budget, locality, BHK, timeline and loan need are filled in, and the lead is scored hot, warm or cold.',
        },
        {
          title: 'You close',
          body: 'Read the chat, step in on WhatsApp with one click, and track the lead to “won”.',
        },
      ],
    },
    features: {
      heading: 'Small team, big reach',
      items: [
        {
          title: 'Sale and rent',
          body: 'It tells rent and sale apart and only suggests the right kind of listing.',
        },
        {
          title: 'Hinglish, naturally',
          body: '“2 BHK chahiye Sector 62 ke paas, 25k tak” is understood and answered in the same style.',
        },
        {
          title: 'Leads that fill themselves in',
          body: 'Every fact a buyer shares lands on the lead, so nothing lives only in your phone.',
        },
        {
          title: 'Team-ready',
          body: 'Add agents with their own logins, assign leads and see who is handling what.',
        },
        {
          title: 'Knows when to call you',
          body: 'Asked for a discount, a call or a legal answer, it hands over and goes quiet.',
        },
        {
          title: 'Minutes to start',
          body: 'Sign up, add a few listings and test the AI yourself before any client sees it.',
        },
      ],
    },
    faq: [
      {
        q: 'I am a single broker. Is this for me?',
        a: 'Yes. It is designed to work for one person as well as a team: it answers when you cannot, and keeps your leads in one place.',
      },
      {
        q: 'Can it handle rental enquiries?',
        a: 'Yes. Add rental listings with the monthly rent, and the AI suggests them only to people looking to rent.',
      },
      {
        q: 'Will buyers know they are talking to an AI?',
        a: 'It is set up as your business’s AI sales assistant, not as a named person, and it hands the chat to someone on your team whenever the buyer asks for one.',
      },
    ],
    related: ['whatsapp-ai-for-real-estate', 'hindi-hinglish-ai-for-real-estate'],
  },
  {
    slug: 'real-estate-lead-management',
    label: 'Lead management & qualification',
    title: 'Real Estate Lead Management Software with AI Qualification',
    description:
      'Capture every property enquiry, let AI qualify budget, location and BHK, score hot, warm and cold leads, assign them to agents and track each one to a sale.',
    eyebrow: 'Real estate lead management',
    h1: 'Real estate lead management that qualifies leads for you',
    intro:
      'A lead management system only helps if the lead has information in it. Ours is fed by an AI sales agent that talks to every enquiry, so leads arrive with budget, location, configuration, timeline and loan need already filled in — and a hot, warm or cold score your team can act on.',
    photo: 'interior',
    problem: {
      heading: 'Why most lead lists go cold',
      points: [
        {
          title: 'A name and a number, nothing else',
          body: 'Portal leads arrive empty. Someone has to call just to find out whether the buyer is serious.',
        },
        {
          title: 'No clear priority',
          body: 'Without scoring, a ready buyer gets the same slow follow-up as someone just browsing.',
        },
        {
          title: 'No ownership',
          body: 'When leads are not assigned, everyone assumes someone else called back.',
        },
      ],
    },
    how: {
      heading: 'How leads move through the pipeline',
      steps: [
        {
          title: 'Capture',
          body: 'Leads are created from WhatsApp and web chats automatically, or added by hand with the source (portal, referral, walk-in…).',
        },
        {
          title: 'Qualify',
          body: 'The AI fills in requirements during the conversation and scores the lead. Humans can edit anything.',
        },
        {
          title: 'Assign',
          body: 'Give each lead an owner. Agents see their leads; managers see everyone’s.',
        },
        {
          title: 'Track to the close',
          body: 'New → contacted → qualified → site visit → negotiation → won or lost, with every change logged.',
        },
      ],
    },
    features: {
      heading: 'Everything a lead needs, nothing it does not',
      items: [
        {
          title: 'One record per buyer',
          body: 'Leads are de-duplicated on phone number, so the same buyer messaging twice never becomes two leads.',
        },
        {
          title: 'Search and filter',
          body: 'Find leads by name, phone, status, score, source or owner.',
        },
        {
          title: 'Hot, warm, cold',
          body: 'Scored from the conversation itself, not from guesswork.',
        },
        {
          title: 'Conversation beside the lead',
          body: 'Open a lead and read exactly what the buyer said before you call.',
        },
        {
          title: 'Clear stage rules',
          body: 'Won leads are final and lost leads can be re-opened, so reports stay honest.',
        },
        {
          title: 'Full history',
          body: 'An audit trail shows who changed what and when — people and AI alike.',
        },
      ],
    },
    faq: [
      {
        q: 'Can I import leads from 99acres, MagicBricks or Housing.com?',
        a: 'Today you can add leads with their source and let the AI talk to them on WhatsApp. Automatic portal lead import is on our roadmap.',
      },
      {
        q: 'Does the AI change leads without asking?',
        a: 'It fills in facts the buyer shares and moves new leads forward to contacted or qualified. It never overwrites a name your team entered, and never marks a lead won or lost.',
      },
      {
        q: 'Is it a full CRM?',
        a: 'It covers leads, conversations, listings, team roles and an audit log for real estate sales. If you already use a CRM, talk to us about integration.',
      },
    ],
    related: ['ai-for-real-estate-builders-developers', 'whatsapp-ai-for-real-estate'],
  },
  {
    slug: 'hindi-hinglish-ai-for-real-estate',
    label: 'Hindi & Hinglish AI',
    title: 'Hindi & Hinglish AI Chatbot for Real Estate Enquiries',
    description:
      'An AI that understands how Indian buyers really write — Hinglish, Hindi in Devanagari and English — and replies in the same language, from your own property listings.',
    eyebrow: 'Hindi and Hinglish AI',
    h1: 'A real estate AI that speaks Hindi and Hinglish like your buyers',
    intro:
      '“Bhai 3 BHK chahiye Noida mein, ready to move, 85 lakh tak.” That is how many buyers write — mixing Hindi and English in Roman script. Most chatbots are built for English. Ours understands Hinglish, Devanagari Hindi and English, replies in the buyer’s own style, and still records clean, structured details on the lead.',
    photo: 'hero',
    problem: {
      heading: 'Why language matters in property sales',
      points: [
        {
          title: 'Buyers write the way they speak',
          body: 'Hinglish, short forms and local area names. A bot that only understands formal English misses the requirement.',
        },
        {
          title: 'A formal reply feels cold',
          body: 'Replying in stiff English to a Hinglish message feels like talking to a machine, not a business.',
        },
        {
          title: 'Families decide together',
          body: 'Parents often prefer Hindi. A reply they can read keeps them in the conversation.',
        },
      ],
    },
    how: {
      heading: 'How the language handling works',
      steps: [
        {
          title: 'It reads the buyer’s style',
          body: 'Roman Hinglish, Devanagari Hindi or English — and it switches when the buyer does.',
        },
        {
          title: 'It replies the same way',
          body: 'Hinglish gets Hinglish, Hindi gets Hindi in Devanagari, English gets English.',
        },
        {
          title: 'It understands Indian units',
          body: '“85 lakh”, “1.2 Cr”, “25k rent” become proper amounts on the lead.',
        },
        {
          title: 'Your team gets clean data',
          body: 'Whatever the language, the lead card shows budget, city, BHK and timeline in a consistent format.',
        },
      ],
    },
    features: {
      heading: 'Language features',
      items: [
        {
          title: 'Mirrors the buyer',
          body: 'No language menus. The buyer just writes; the AI follows.',
        },
        {
          title: 'Indian money, written the Indian way',
          body: 'Prices appear as ₹85 lakh or ₹1.2 crore — never as confusing raw numbers.',
        },
        {
          title: 'Business default language',
          body: 'Set the language the AI starts in for your business: English, Hindi or Hinglish.',
        },
        {
          title: 'Same rules in every language',
          body: 'No invented properties, prices or discounts — whether it writes in Hindi or English.',
        },
        {
          title: 'Works on WhatsApp and web',
          body: 'The same AI and language handling on every channel.',
        },
        {
          title: 'Hands over gracefully',
          body: 'When a person is needed, it tells the buyer in their language that your team will reach out.',
        },
      ],
    },
    faq: [
      {
        q: 'Does it support regional languages like Marathi or Tamil?',
        a: 'Today it is tuned for English, Hindi and Hinglish. More Indian languages are on our roadmap.',
      },
      {
        q: 'Can I choose which language it starts with?',
        a: 'Yes. Set your business’s preferred language in settings; after the first message, it follows the buyer.',
      },
      {
        q: 'What about voice notes in Hindi?',
        a: 'Voice notes are not transcribed yet; the AI politely asks the buyer to type the key details. Voice support is planned.',
      },
    ],
    related: ['whatsapp-ai-for-real-estate', 'ai-for-real-estate-brokers'],
  },
];

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** <title> if different from the H1. */
  metaTitle: string;
  description: string;
  published: string;
  updated: string;
  readingMinutes: number;
  intro: string;
  sections: GuideSection[];
  faq: FaqItem[];
  related: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-respond-to-property-portal-leads',
    title: 'How to respond to 99acres, MagicBricks and Housing.com leads faster',
    metaTitle: 'How to Respond to 99acres & MagicBricks Leads Faster',
    description:
      'A practical playbook for Indian brokers and builders: how to answer property portal leads quickly, what to ask first, and how to stop good leads going cold.',
    published: '2026-11-18',
    updated: '2026-11-18',
    readingMinutes: 6,
    intro:
      'Portal leads are expensive, and they are rarely exclusive: the same buyer usually enquires on several listings at once. The business that replies first, and replies usefully, gets the conversation. Here is a simple playbook you can run with or without software.',
    sections: [
      {
        heading: '1. Reply on the channel the buyer uses',
        paragraphs: [
          'Most portal enquiries include a mobile number, and most Indian buyers prefer WhatsApp to an unexpected call. A short, polite WhatsApp message lets the buyer answer when it suits them — and leaves a written record of what they want.',
          'Call when the buyer asks for a call, or when the lead is clearly hot. Calling every lead first wastes your team’s best hours on people who were only browsing.',
        ],
      },
      {
        heading: '2. Make the first message useful, not generic',
        paragraphs: [
          '“Hi, thanks for your enquiry” gives the buyer nothing. Mention the property they enquired about and ask one easy question.',
        ],
        list: [
          'Name the listing: “Thanks for asking about the 3 BHK in Sector 150.”',
          'Ask one question at a time: budget first, or whether they want ready-to-move.',
          'Write in their language. A Hinglish enquiry deserves a Hinglish reply.',
        ],
      },
      {
        heading: '3. Qualify with the same five questions every time',
        paragraphs: [
          'Consistency is what makes leads comparable. Ask, over the course of the conversation: budget, preferred location, configuration (BHK), timeline, and whether they need a home loan. Purpose — self-use or investment — is a useful sixth.',
          'Record the answers on the lead, not in the chat. A requirement that only exists in one agent’s WhatsApp is lost the day that agent is on leave.',
        ],
      },
      {
        heading: '4. Prioritise hot leads',
        paragraphs: [
          'A buyer with a clear budget, a location and a wish to visit this week is hot. Someone “just checking prices” is cold. Score leads as you learn, and call the hot ones first.',
        ],
      },
      {
        heading: '5. Never let a lead sit without an owner',
        paragraphs: [
          'Assign every lead to a person the moment it arrives. Unassigned leads are the ones everyone assumes someone else called.',
        ],
      },
      {
        heading: 'Where an AI sales agent helps',
        paragraphs: [
          'Steps 1 to 4 are repetitive and time-sensitive — exactly the part software can do well. An AI sales agent can send the first useful reply within seconds at any hour, ask the qualifying questions in Hindi, English or Hinglish, fill in the lead and score it, then hand serious buyers to your team for the call, the visit and the negotiation.',
        ],
      },
    ],
    faq: [
      {
        q: 'Should I call or WhatsApp a new portal lead?',
        a: 'Start with a short, personalised WhatsApp message unless the buyer asked for a call. Call hot leads as soon as they show clear intent.',
      },
      {
        q: 'What should I ask a property buyer first?',
        a: 'One easy question: their budget, or whether they want ready-to-move. Then location, configuration, timeline and home-loan need, one at a time.',
      },
    ],
    related: ['real-estate-lead-management', 'whatsapp-ai-for-real-estate'],
  },
  {
    slug: 'whatsapp-24-hour-rule-for-real-estate',
    title: 'The WhatsApp 24-hour rule, explained for real estate businesses',
    metaTitle: 'WhatsApp 24-Hour Rule Explained for Real Estate',
    description:
      'What the WhatsApp Business API 24-hour customer service window means for brokers and builders, when you need template messages, and how to plan follow-ups.',
    published: '2026-11-18',
    updated: '2026-11-18',
    readingMinutes: 5,
    intro:
      'If you move from the WhatsApp Business app to the WhatsApp Business Platform (the API), one rule changes how you follow up with buyers: the 24-hour customer service window. Understanding it saves a lot of “message failed” surprises.',
    sections: [
      {
        heading: 'What the rule says',
        paragraphs: [
          'When a buyer messages your business, a 24-hour window opens. Inside it you can reply with any normal message — text, photos, brochures. Every new message from the buyer restarts the 24 hours.',
          'Outside the window, WhatsApp only lets a business send pre-approved template messages. A free-form message sent after the window closes is rejected.',
        ],
      },
      {
        heading: 'Why WhatsApp does this',
        paragraphs: [
          'It protects users from spam: businesses can talk freely while the customer is engaged, but must use reviewed templates to start or restart a conversation.',
        ],
      },
      {
        heading: 'What it means for property sales',
        paragraphs: ['Real estate decisions take weeks, so plan for both modes:'],
        list: [
          'Answer fast while the window is open — that is when the buyer is engaged.',
          'Use the window to agree a next step, such as a site-visit day.',
          'Prepare templates for follow-ups: visit reminders, new matching listings, price updates.',
          'Ask the buyer a question at the end of a conversation; their reply reopens the window.',
        ],
      },
      {
        heading: 'How our product handles it',
        paragraphs: [
          'The shared inbox shows how much of the 24-hour window is left for every WhatsApp conversation, and blocks free-form replies once it closes so nobody sends a message that will fail. The AI replies inside the window automatically. Template messages for follow-ups after 24 hours are the next feature we are adding.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does the 24-hour rule apply to the WhatsApp Business app?',
        a: 'The rule applies to the WhatsApp Business Platform (API). The free phone app works differently but cannot be safely automated.',
      },
      {
        q: 'Does a new buyer message reset the window?',
        a: 'Yes. Each message from the buyer opens a fresh 24-hour window.',
      },
    ],
    related: ['whatsapp-ai-for-real-estate', 'ai-for-real-estate-brokers'],
  },
  {
    slug: 'questions-to-qualify-property-buyers',
    title: 'Questions to qualify property buyers in India (with Hinglish examples)',
    metaTitle: 'Questions to Qualify Property Buyers in India',
    description:
      'The questions that separate serious property buyers from browsers — budget, location, BHK, timeline, loan and purpose — with natural Hinglish phrasing.',
    published: '2026-11-18',
    updated: '2026-11-18',
    readingMinutes: 5,
    intro:
      'Good qualification is not an interrogation. It is a few natural questions, asked one at a time, that tell you whether to send listings, book a visit or simply stay in touch. Here are the questions that matter most in Indian residential sales, with ways to ask them in Hinglish.',
    sections: [
      {
        heading: 'Budget',
        paragraphs: [
          'Ask for a range, not a number. Buyers often stretch a little for the right home, so a range tells you more.',
        ],
        list: [
          'English: “What budget range are you considering?”',
          'Hinglish: “Aapka budget roughly kitna hai — 70 se 90 lakh ke beech?”',
        ],
      },
      {
        heading: 'Location',
        paragraphs: [
          'Ask for the city and one or two preferred localities or sectors, and why — near office, near school, near parents.',
        ],
        list: ['Hinglish: “Kaunsa area prefer karenge? Office ke paas chahiye?”'],
      },
      {
        heading: 'Configuration',
        paragraphs: ['BHK first, then must-haves such as carpet area, floor or facing.'],
        list: ['Hinglish: “2 BHK dekh rahe hain ya 3 BHK?”'],
      },
      {
        heading: 'Timeline and possession',
        paragraphs: [
          'Ready-to-move or under-construction? When do they want to move or invest? This one question often decides whether a lead is hot.',
        ],
        list: ['Hinglish: “Ready to move chahiye ya under-construction bhi chalega?”'],
      },
      {
        heading: 'Home loan',
        paragraphs: [
          'Ask whether they will need a loan — never promise approval. A buyer with a pre-approved loan is usually further along.',
        ],
      },
      {
        heading: 'Purpose',
        paragraphs: [
          'Self-use or investment? Investors care about rental yield and appreciation; families care about schools and amenities.',
        ],
      },
      {
        heading: 'Turning answers into a score',
        paragraphs: [
          'A simple rule works: clear budget + location + wants to visit or buy soon = hot. Some details and a vague timeline = warm. Just browsing = cold. Write the score on the lead and follow up hot leads first.',
          'An AI sales agent can ask these questions naturally in Hindi, English or Hinglish, record each answer on the lead and suggest a score — so your team starts every call already informed.',
        ],
      },
    ],
    faq: [
      {
        q: 'How many questions should I ask in the first message?',
        a: 'One. Ask the easiest question first and the rest over the conversation.',
      },
      {
        q: 'Should I ask about the buyer’s income?',
        a: 'No. Ask about budget and home-loan need instead. Income questions feel intrusive and are not needed to qualify.',
      },
    ],
    related: ['real-estate-lead-management', 'hindi-hinglish-ai-for-real-estate'],
  },
];

export const solutionBySlug = (slug: string) => SOLUTIONS.find((s) => s.slug === slug);
export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
