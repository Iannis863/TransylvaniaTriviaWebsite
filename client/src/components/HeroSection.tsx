import { Button } from "@/components/ui/button";
import logoImage from "@assets/Transylvania_Trivia_2.png";

export default function HeroSection() {
  const handleJoinClick = () => {
    const registerSection = document.getElementById("register");
    if (registerSection) {
      registerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center text-center px-4 py-16 gap-8">
        <img 
          src={logoImage} 
          alt="TransylvaniaTrivia Logo" 
          className="w-64 md:w-80 lg:w-96 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          data-testid="img-logo"
        />
        
        <div className="space-y-4">
          <p 
            className="font-heading text-2xl md:text-3xl tracking-wider text-cyan-400"
            data-testid="text-tagline"
          >
            QUIZ NIGHT AT INSOMNIA RESTAURANT
          </p>
          <p className="text-muted-foreground text-lg max-w-lg">
            Test your knowledge, challenge your friends, and win amazing prizes at the most thrilling trivia night in town.
          </p>
        </div>
        
        <Button 
          size="lg"
          onClick={handleJoinClick}
          className="px-10 py-6 text-lg font-heading tracking-wider bg-gradient-to-r from-purple-600 to-purple-500 border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          data-testid="button-join"
        >
          JOIN THE BATTLE
        </Button>
      </div>
    </section>
  );
}
