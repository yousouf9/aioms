import Link from "next/link";

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
}

export function WhatsAppButton({
  phone,
  message = "Hi! I'd like to make an enquiry about Agro Hub Lafia.",
}: WhatsAppButtonProps) {
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full shadow-modal transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: "#25D366" }}
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.163 0 16c0 2.825.737 5.476 2.027 7.782L0 32l8.418-2.004A15.926 15.926 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.28 13.28 0 0 1-6.77-1.854l-.486-.29-5.003 1.192 1.215-4.866-.318-.5A13.254 13.254 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.3-9.938c-.4-.2-2.364-1.167-2.73-1.3-.366-.133-.633-.2-.9.2-.266.4-1.033 1.3-1.266 1.567-.234.266-.467.3-.867.1-.4-.2-1.69-.622-3.22-1.984-1.19-1.06-1.993-2.37-2.227-2.77-.233-.4-.025-.616.175-.815.18-.18.4-.467.6-.7.2-.234.267-.4.4-.667.133-.266.067-.5-.033-.7-.1-.2-.9-2.167-1.233-2.967-.325-.78-.656-.674-.9-.686l-.767-.013c-.267 0-.7.1-1.066.5-.367.4-1.4 1.367-1.4 3.333s1.433 3.867 1.633 4.133c.2.267 2.822 4.308 6.836 6.04.955.413 1.7.66 2.28.844.957.305 1.83.262 2.52.159.769-.115 2.364-.967 2.697-1.9.334-.934.334-1.733.234-1.9-.1-.167-.367-.267-.767-.467z" />
      </svg>
    </Link>
  );
}
