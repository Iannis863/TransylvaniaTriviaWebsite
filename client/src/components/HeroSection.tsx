import logoImage from "@assets/Logo 4.png";

export default function HeroSection() {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pt-12 pb-6">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
      
      {/* Removed z-10 from this line so the blend mode can pass through! 👇 */}
      <div className="relative flex flex-col items-center text-center px-4 gap-2">
        <img 
          src={logoImage} 
          alt="TransylvaniaTrivia Logo" 
          className="mix-blend-lighten h-48 sm:h-56 md:h-64 lg:h-72 w-auto object-contain"
        />
        
        <div className="space-y-3">
          <p className="font-heading text-2xl md:text-3xl tracking-wider text-purple-400">
            CONCURS DE TRIVIA LA INSOMNIA
          </p>
          <p className="text-muted-foreground text-lg max-w-lg">
            Testează-ți cunoștințele și câștigă premii!
          </p>
        </div>
      </div>
    </section>
  );
}
