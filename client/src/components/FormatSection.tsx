import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Image, Music, Target, Skull, Coffee, Coins } from "lucide-react";

const rounds = [
  {
    id: "round1",
    name: "General Knowledge",
    description: "Warm up with easier questions to get everyone confident and in the zone.",
    icon: Brain,
    questions: 10,
    color: "border-green-500/30",
    iconColor: "text-green-400",
  },
  {
    id: "round2",
    name: "Find The Link Between The Pictures",
    description: "Identify the link between 2 pictures. Visual memory time!",
    icon: Image,
    questions: 10,
    color: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    id: "round3",
    name: "Continue The Lyrics",
    description: "15-20 seconds of a song. Continue the lyrics. Fan favorite!",
    icon: Music,
    questions: 10,
    color: "border-pink-500/30",
    iconColor: "text-pink-400",
  },
  {
    id: "break",
    name: "Break Time",
    description: "15 minutes to grab drinks, discuss strategy, and prepare for the final push!",
    icon: Coffee,
    questions: null,
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
    isBreak: true,
  },
  {
    id: "round4",
    name: "Thematic Round 1",
    description: "A focused topic each week - could be 'The 2000s', 'AI & Tech', 'Geography', or more!",
    icon: Target,
    questions: 10,
    color: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    id: "round5",
    name: "Thematic Round 2",
    description: "Another themed topic to test your specialized knowledge. Double the themes, double the fun!",
    icon: Target,
    questions: 10,
    color: "border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    id: "break2",
    name: "Break Time",
    description: "15 minutes to discuss strategy for the final wager!",
    icon: Coffee,
    questions: null,
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
    isBreak: true,
  },
  {
    id: "final",
    name: "Final Question Wager",
    description: "One impossibly hard question. Bet your points wisely - glory or doom awaits!",
    icon: Coins,
    questions: 1,
    color: "border-purple-500/30",
    iconColor: "text-purple-400",
    isFinal: true,
  },
];

export default function FormatSection() {
  return (
    <section id="format" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-format-title"
        >
          QUIZ FORMAT
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Five rounds of trivia glory, one legendary final question
        </p>
        
        <div className="relative space-y-4">
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-500 via-cyan-500 to-amber-500 hidden md:block" />
          
          {rounds.map((round, index) => (
            <Card 
              key={round.id}
              className={`relative border ${round.color} md:ml-12 ${round.isBreak ? 'bg-amber-500/5' : ''} ${round.isFinal ? 'bg-purple-500/5' : ''}`}
              data-testid={`card-format-${round.id}`}
            >
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-purple-500 hidden md:flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              
              <CardContent className="p-6 flex flex-wrap gap-4 items-start">
                <div className={`w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0`}>
                  <round.icon className={`w-6 h-6 ${round.iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-heading text-xl tracking-wide">{round.name}</h3>
                    {round.questions !== null && (
                      <Badge variant="outline" className="text-xs">
                        {round.questions} {round.questions === 1 ? 'Question' : 'Questions'}
                      </Badge>
                    )}
                    {round.isBreak && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        15 min
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{round.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
