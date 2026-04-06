import heroImage from "@/assets/hero-serra.jpg";
import { MapPin, Search } from "lucide-react";

interface HeroSectionProps {
  onScrollToEvents: () => void;
}

const HeroSection = ({ onScrollToEvents }: HeroSectionProps) => {
  return (
    <section className="relative h-[70vh] min-h-[500px] flex items-end overflow-hidden">
      <img
        src={heroImage}
        alt="Paisagem da Serra Gaúcha"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={800}
      />
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 container mx-auto pb-12 px-4">
        <div className="max-w-2xl animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-primary-foreground mb-4 leading-tight drop-shadow-lg">
            Descubra a Serra Gaúcha
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 drop-shadow-md">
            Explore eventos incríveis de música, gastronomia, esporte e cultura na região mais encantadora do sul do Brasil.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onScrollToEvents}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary rounded-full font-semibold text-primary-foreground hover:bg-wine-dark transition-colors shadow-lg"
            >
              <Search className="w-5 h-5" />
              Explorar Eventos
            </button>
            <span className="inline-flex items-center gap-2 px-5 py-3 bg-card/20 backdrop-blur-sm rounded-full text-primary-foreground text-sm border border-primary-foreground/20">
              <MapPin className="w-4 h-4" />
              Gramado, Canela, Bento Gonçalves e mais
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
