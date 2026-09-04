import logoUrl from "@/assets/logo.png";

// Single source of truth for the product mark — every brand spot in the
// app (Sidebar, Login, RegisterOwner, OnboardingBilling, PlatformLayout)
// renders this instead of duplicating an <img> tag, so swapping the logo
// later is a one-file change.
export default function Logo({ className = "h-8 w-8" }) {
  return <img src={logoUrl} alt="StayOps" className={`${className} rounded-md object-cover`} />;
}
