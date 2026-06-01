import { MapPin, Clock, Users, Mail } from "lucide-react";
import { SiInstagram, SiTiktok, SiFacebook, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";

export default function FooterSection() {
  return (
    <footer className="py-16 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 
              className="font-heading text-2xl tracking-wider mb-6 text-purple-400"
              data-testid="text-venue-title"
            >
              LOCAȚIE
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {/* Changed text-cyan-400 to text-purple-400 to match your new branding theme */}
                <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Restaurantul Insomnia</p>
                  <p className="text-muted-foreground text-sm">Strada Universității nr. 2</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">În fiecare marți de la ora 20:00</p>
                  <p className="text-muted-foreground text-sm">Nu întârzia – quiz-ul începe la fix!</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Dimensiune echipă: Max. 6 persoane</p>
                  <p className="text-muted-foreground text-sm">Adună-ți cei mai isteți prieteni!</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 
              className="font-heading text-2xl tracking-wider mb-6 text-purple-400"
              data-testid="text-connect-title"
            >
              URMĂREȘTE-NE
            </h3>
            <p className="text-muted-foreground mb-6">
              Urmărește-ne pentru anunțuri, indicii despre quiz și distracție din culise!
            </p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://www.instagram.com/transylvaniatrivia/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="gap-2"
                  data-testid="button-instagram"
                >
                  <SiInstagram className="w-5 h-5" />
                  Instagram
                </Button>
              </a>
              <a 
                href="https://www.tiktok.com/@transylvaniatrivia" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="gap-2"
                  data-testid="button-tiktok"
                >
                  <SiTiktok className="w-5 h-5" />
                  TikTok
                </Button>
              </a>
              <a 
                href="https://www.facebook.com/share/1AXKd9KwTt/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="gap-2"
                  data-testid="button-facebook"
                >
                  <SiFacebook className="w-5 h-5" />
                  Facebook
                </Button>
              </a>
              <a 
                href="https://wa.me/40721316695" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="gap-2"
                  data-testid="button-whatsapp"
                >
                  <SiWhatsapp className="w-5 h-5" />
                  WhatsApp
                </Button>
              </a>
            </div>
            
            <div className="flex items-center gap-2 mt-6 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Contactează-ne la </span>
              <a 
                href="mailto:contact@transylvaniatrivia.com" 
                className="text-purple-400 hover:underline"
                data-testid="link-email"
              >
                contact@transylvaniatrivia.com
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground text-sm">
            TransylvaniaTrivia la Restaurantul Insomnia
          </p>
        </div>
      </div>
    </footer>
  );
}
