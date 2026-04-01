import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  // Replace with actual coordinator number
  const whatsappNumber = '94770000000'; 
  const message = encodeURIComponent('Hello! I need help with the Nexus Online LMS.');

  return (
    <a 
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-wa"
      aria-label="Contact Coordinator on WhatsApp"
    >
      <MessageCircle />
    </a>
  );
}
