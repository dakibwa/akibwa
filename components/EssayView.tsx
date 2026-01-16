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

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#fafafa] dark:bg-[#1a1a1a] overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <button 
          onClick={onClose}
          className="mb-12 text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <article className="space-y-12">
          <header className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-[#666] dark:text-[#999]">
              <span>Essay</span>
              <span>·</span>
              <time>4th Jan 2026</time>
          </div>
            <h1 className="text-4xl md:text-5xl font-normal tracking-tight leading-tight">
              Livestream Your Life: The Performance of Being
          </h1>
            <div className="w-16 h-px bg-[#1a1a1a] dark:bg-[#e0e0e0]"></div>
            <p className="text-xl text-[#666] dark:text-[#999] italic leading-relaxed">
              "The next device won't just record your life—it will teach you how to live one you're willing to replay."
          </p>
        </header>

          <section className="space-y-6 text-lg leading-relaxed">
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

          <footer className="pt-12 mt-12 border-t border-[#e0e0e0] dark:border-[#333] text-sm text-[#999] dark:text-[#666] text-center">
            Akibwa • 2026
        </footer>
      </article>
      </div>
    </div>
  );
};

export default EssayView;