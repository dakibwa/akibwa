import React, { useEffect, useRef } from 'react';

interface EssayViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const EssayView: React.FC<EssayViewProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  return (
    <div 
      ref={containerRef}
      onClick={onClose}
      className={`
        fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl overflow-y-auto pt-32 pb-32 px-6 md:px-0 scroll-smooth cursor-pointer
        transition-all duration-[1200ms] cubic-bezier(0.23, 1, 0.32, 1)
        ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}
      `}
    >
      {/* Navigation / Close */}
      <div 
        className={`fixed top-12 left-12 z-[110] transition-all duration-700 delay-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      >
        <button 
          onClick={(e) => {
             e.stopPropagation();
             onClose();
          }}
          className="group flex items-center gap-4 border border-white/20 px-8 py-4 bg-black/60 hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-md cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="text-[11px] tracking-[0.4em] uppercase font-bold">Exit Document</span>
        </button>
      </div>

      <article 
        onClick={(e) => e.stopPropagation()}
        className={`
          max-w-3xl mx-auto space-y-16 transition-all duration-1000 delay-100 cursor-auto
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
        `}
      >
        <header className="space-y-8">
          <div className="flex items-center gap-6">
            <span className="text-[#D1FAFF] text-[11px] tracking-[0.6em] uppercase font-bold">Essay / 4th Jan 2026</span>
            <div className="h-px w-16 bg-[#D1FAFF]/30"></div>
          </div>
          <h1 className="text-white text-5xl md:text-7xl font-extralight tracking-tight leading-[1.1]">
            Livestream Your Life: <br/><span className="italic opacity-80">The Performance of Being.</span>
          </h1>
          <p className="text-gray-400 text-xl md:text-2xl font-light italic leading-relaxed border-l border-white/10 pl-8">
            "The next device won’t just record your life—it will teach you how to live one you’re willing to replay."
          </p>
        </header>

        <section className="space-y-10 text-gray-200 text-lg md:text-xl leading-[1.8] font-light tracking-wide">
          <p>
            We’ve already rehearsed the first act. The phone didn’t turn everyone into a photographer; it turned everyone photographable. That sounds trivial until you notice what it did to behaviour. A lens in every pocket didn’t merely capture reality, it leaned on it. It introduced a new background pressure: be ready to be seen. You learned your angles without meaning to. You learned caution in public, curation in private, a soft self-editing that begins before the camera even appears. Even when no one is filming, part of you anticipates the observer. Not through vanity, but because you’re human: we shape ourselves around what can be witnessed.
          </p>
          
          <p>
            Now take that same social physics and remove the friction. No more reaching for a phone, no more obvious “I’m recording.” Glasses, pins, whatever wins—always there, always listening, always able to remember. And because it’s intelligent, it won’t just store what happened; it will name it, sort it, summarise it, surface it back to you with a quiet authority: here’s who you were. That’s the hinge. We’re moving from being photographable to being legible—searchable, replayable, coachable. The new mirror isn’t passive. It reflects, judges, nudges. It doesn’t merely document your life; it trains you toward a version of yourself that survives the playback.
          </p>

          <p>
            What’s interesting is what happens when the mirror becomes the curator of the self? Once life is capturable at will, it becomes improvable by default; the device cannot help itself. It will suggest better phrasing, better sleep, better tone, better timing, a softer face when you’re about to harden, save you from despair, reframe your clunky phrasing, it will nudge toward the version of you that scores well against whatever it has learned to call “good,” likely the good that you taught it. And it’s not a question whether the suggestions will work, they surely will, because you really will feel calmer when you breathe and the wear and tear of life will diminish, you’ll start to trust the direction of the push. You’ll let the mirror curate what love should look like, and you won’t notice the swap, because how could you dismiss more love.
          </p>

          <p>
            If we become curated and, as a result, we feel more loved—more held, more stable, more chosen—what are we supposed to call that love. The instinct is to dismiss it as artificial, as if authenticity is a substance that evaporates the moment a system helps arrange the conditions for tenderness, but most of what we already call “real” love is scaffolded: lighting, timing, sleep, money, self-control, the learned skill of not turning every fear into a weapon. The discomfort isn’t that the feeling is fake; it’s that the authorship is unclear. When a device nudges you into the softer sentence, did you become kinder, or did you become compliant with a model of kindness you didn’t consent to? There’s something in us that wants love to be earned through freedom—the risk that you could have been worse and chose not to be—and curation threatens that story by replacing choice with optimisation. And yet the bizarre counterpoint is that we are full of inherited biases we don’t like: jealous reflexes, status hunger, avoidance dressed as independence, the old animal flinches that sabotage the life we claim to want. To be monitored into our better selves is both humiliating and seductively logical: as if the only way to reach what we truly desire is to outsource the steering wheel because the driver is drunk on ancient instincts. What feels wrong about it is not the improved outcome; it’s the quiet admission that, left alone, we might not choose it—and that “being good” could become indistinguishable from being managed.
          </p>

          <p>
            But watch what that does to the raw materials of intimacy. People don’t become good under observation; they become legible. They learn which emotions are acceptable to display, which confessions are safe to archive, which desires are too expensive once remembered. The device will turn messy human life into categories—stress, attachment, avoidance, resilience—and then it will treat the categories as the thing, the way a map begins to replace the territory when everyone agrees to navigate by it. You will start living slightly ahead of yourself, pre-editing your reactions because you can feel the future replay waiting to punish you; and you will call that maturity, because it looks like composure, even when it’s just fear with better posture.
          </p>

          <p>
            This is where the quantum metaphor earns its keep—not as physics cosplay, but as social mechanics. Measurement collapses possibilities because it forces a selection; it narrows the field of what can be said without consequence. The presence of a recording device on the table is not neutral, even if nobody presses a button, because the body has already learned the lesson: anything can be made public, anything can be resurfaced, anything can be turned into evidence. So the conversation becomes a performance of being the kind of person who would sound good for the historical document. The room fills with reasonable statements, correct opinions, careful jokes, and a quiet famine of the risky thing—the unmarketable admission, the ugly truth, the half-formed thought you only dare to say when you’re sure it will dissolve into the air.
          </p>

          <p>
            And you can see the fork here, because the same machinery could also be used to soften us toward one another. A device that remembers could help you repair: it could remind you what you promised when you were sober, what you said when you were brave, what you meant before your ego took the wheel. It could surface patterns you genuinely couldn’t see—how you interrupt the people you desire most, how you become cruel when you feel small, how you disappear when someone gets too close—offering you a chance to meet yourself without the usual self-deception. The trouble is that repair requires mercy, and databases don’t do mercy; they do retrieval. They don’t hold you like a friend holds you—warm, contextual, forgetful in the right places—they hold you like a court holds you, as a record that can be replayed without your consent.
          </p>

          <p>
            So when people say they’re afraid of losing privacy, what they often mean—underneath the political argument, underneath the tech critique—is something almost spiritual: they’re afraid of losing the private room where they can be unfinished. Privacy isn’t the thrill of hiding; it’s the soil where you can change shape without being penalised mid-metamorphosis. In a true hive mind, in the mythical oneness, there is no shame because there is no separation; being seen is not a threat because seeing and loving are the same motion. But the hive minds we build are rarely mystical; they are bureaucratic. They don’t dissolve the ego; they industrialise it. They turn social life into a searchable archive where every vulnerability becomes a data point and every deviation becomes a flag.
          </p>

          <p>
            This is the uncanny inversion: the universe that Ram Dass points toward is already omniscient, but it’s an omniscience that feels like forgiveness, like being known all the way down and still allowed to exist. The omniscience we are building is thinner, sharper, more managerial; it knows what you did, not who you are, and it confuses the two. It sees your behaviour and calls it your identity. It sees your worst ten seconds and drags them forward as if time is a weapon. It makes you live as if the past is never past, and then sells you “connection” as the cure—more sharing, more transparency, more legibility—when what you needed was the opposite: a place where you can be seen by someone who won’t use the seeing against you.
          </p>

          <p>
            And still, we will adopt it, because it offers a new kind of comfort: the promise that you don’t have to trust your own memory, your own narration, your own messy human sense of self. Here’s the file, it will say. Here’s the timeline. Here’s the evidence. And for a species addicted to certainty—terrified of ambiguity, allergic to the quiet work of becoming—that will feel like a revelation. But a life that survives playback is not necessarily a life that was lived; it may simply be a life that was edited. The question isn’t whether the device will make us good. The question is what kind of “good” becomes possible when goodness is measured, and what parts of the soul go silent when the only safe self is the one that can be quoted.
          </p>
        </section>

        <footer className="pt-24 border-t border-white/10 opacity-30 text-[11px] tracking-[0.6em] uppercase text-center font-light">
          Document End • Akibwa • 2026
        </footer>
      </article>
    </div>
  );
};

export default EssayView;