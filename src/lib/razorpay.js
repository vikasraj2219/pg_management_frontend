// Lazily loads the Razorpay Checkout script once and reuses it across the
// app (BillingTab settings tab + the post-signup onboarding step).
let razorpayScriptPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Could not load the payment gateway. Check your connection and try again."));
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}
