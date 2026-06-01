import logoImage from "@assets/Logo.png";

export default function HeroSection() {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pt-12 pb-6">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
      
      {/* Reduced the gap-8 to gap-2 since the image itself already has white space built into it */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 gap-2">
        <img 
          src={logoImage} 
          alt="TransylvaniaTrivia Logo" 
          {/* Changed sizing to scale cleanly by height and removed the purple drop-shadow */}
          className="h-48 sm:h-56 md:h-64 lg:h-72 w-auto object-contain"
          data-testid="img-logo"
        />
        
        <div className="space-y-3">
          {/* Changed color from text-cyan-400 to text-purple-400 to match the logo */}
          <p 
            className="font-heading text-2xl md:text-3xl tracking-wider text-purple-400"
            data-testid="text-tagline"
          >
            CONCURS DE TRIVIA LA INSOMNIA CAFE & BISTRO
          </p>
          <p className="text-muted-foreground text-lg max-w-lg">
            Testează-ți cunoștințele și câștigă premii!
          </p>
        </div>
      </div>
    </section>
  );
}
