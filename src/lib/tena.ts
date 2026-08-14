export const ADMIN_EMAIL = "tenaspecial@gmail.com";

/** Telegram account used to send doctor withdrawals. */
export const PAYOUT_TELEGRAM = "@tenachinbottelemedicine";

export const PLANS = [
  {
    id: "basic",
    name: "Basic Care",
    amharic: "መሠረታዊ",
    price: 300,
    duration: "3 days of chat access",
    features: [
      "One specialist consultation",
      "3 days of secure chat",
      "General health guidance",
      "Prescription advice notes",
    ],
  },
  {
    id: "standard",
    name: "Standard Care",
    amharic: "መደበኛ",
    price: 500,
    duration: "7 days of chat access",
    popular: true,
    features: [
      "One specialist consultation",
      "7 days of secure chat",
      "Lab result review",
      "Follow-up questions included",
      "Priority admin review",
    ],
  },
  {
    id: "premium",
    name: "Premium Care",
    amharic: "ልዩ",
    price: 1000,
    duration: "30 days of chat access",
    features: [
      "Unlimited messages for 30 days",
      "Choose any specialist",
      "Lab & imaging review",
      "Second opinion from another doctor",
      "Fastest review & response",
    ],
  },
] as const;

export const PAYMENT_DETAILS = [
  {
    method: "CBE",
    label: "Commercial Bank of Ethiopia",
    account: "1000255631865",
    holder: "Tazebachew Wudie",
  },
  {
    method: "Telebirr",
    label: "Telebirr Mobile Money",
    account: "0908343267",
    holder: "Tazebachew Wudie",
  },
] as const;

export const SPECIALTIES = [
  "General Practitioner",
  "Internal Medicine",
  "Pediatrics",
  "Gynecology & Obstetrics",
  "Dermatology",
  "Cardiology",
  "Neurology",
  "Psychiatry & Mental Health",
  "Orthopedics",
  "Ophthalmology",
  "ENT (Ear, Nose & Throat)",
  "Dentistry",
  "Nutrition & Dietetics",
  "Surgery",
  "Urology",
  "Oncology",
];

export const planById = (id: string) => PLANS.find((p) => p.id === id);

export function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "declined") return "Declined";
  return "Pending review";
}

/** Telegram support account for patients and doctors. */
export const SUPPORT_TELEGRAM = "@tenaspecial";
export const SUPPORT_TELEGRAM_URL = "https://t.me/tenaspecial";

/** Telegram bot with free health documents anyone can upload to / read. */
export const DOCS_BOT_TELEGRAM = "@tenanetbot";
export const DOCS_BOT_URL = "https://t.me/tenanetbot";

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const SECURITY_QUESTION_OPTIONS = [
  "What is your mother's first name?",
  "What is the name of the town where you were born?",
  "What was the name of your first school?",
  "What is your father's first name?",
  "What is the name of your best childhood friend?",
  "What is your favourite food?",
  "What was your first job?",
  "What is the name of your favourite teacher?",
];

/** A doctor counts as online when seen in the last 3 minutes. */
export function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 3 * 60 * 1000;
}
