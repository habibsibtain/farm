import { I18n } from "i18n-js";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import or from "./locales/or.json";
import pa from "./locales/pa.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import kn from "./locales/kn.json";
import bn from "./locales/bn.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "or", label: "Odia" },
  { code: "pa", label: "Punjabi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" }
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const i18n = new I18n({
  en,
  hi,
  mr,
  or,
  pa,
  te,
  ta,
  kn,
  bn
});

i18n.enableFallback = true;
i18n.defaultLocale = "en";
