import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { whatsappLink } from "@/lib/site";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with El Greco on WhatsApp (opens in a new tab)"
      className="group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 print:hidden flex items-center gap-2 rounded-full bg-whatsapp p-3.5 text-white shadow-float transition hover:scale-105 hover:brightness-105 focus-visible:outline-offset-4 sm:right-6 sm:bottom-6 sm:pr-5"
    >
      <WhatsAppIcon className="size-7" />
      <span className="hidden text-sm font-semibold text-charcoal-950 sm:inline">
        Chat with us
      </span>
    </a>
  );
}
