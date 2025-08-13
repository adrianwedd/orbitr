import { SampleLibraryItem } from './types';
import { rid } from './utils';

export interface SamplePack {
  id: string;
  name: string;
  description: string;
  samples: {
    prompt: string;
    name: string;
    suggestedTrack?: string; // track1, track2, track3, track4
  }[];
}

// 5 curated AI sample packs as mentioned in CLAUDE.md
export const SAMPLE_PACKS: SamplePack[] = [
  {
    id: 'lofi',
    name: 'Lo-Fi',
    description: 'Warm, nostalgic lo-fi beats and textures',
    samples: [
      { prompt: 'soft lofi kick drum with vinyl warmth and subtle crackle', name: 'Lo-Fi Kick', suggestedTrack: 'track1' },
      { prompt: 'mellow lo-fi snare with tape saturation and ambient reverb', name: 'Lo-Fi Snare', suggestedTrack: 'track2' },
      { prompt: 'warm analog vinyl crackle texture loop', name: 'Vinyl Texture', suggestedTrack: 'track3' },
      { prompt: 'dreamy lo-fi jazz chord stab with piano warmth', name: 'Jazz Stab', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'techno',
    name: 'Techno',
    description: 'Industrial techno beats and synthesized elements',
    samples: [
      { prompt: 'hard industrial techno kick drum with sub bass thump', name: 'Techno Kick', suggestedTrack: 'track1' },
      { prompt: 'sharp digital techno snare with metallic ring', name: 'Techno Snare', suggestedTrack: 'track2' },
      { prompt: 'acid techno bass sequence with 303-style resonance', name: 'Acid Bass', suggestedTrack: 'track3' },
      { prompt: 'industrial techno percussion loop with mechanical sounds', name: 'Tech Perc', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'trap',
    name: 'Trap',
    description: 'Modern trap drums and 808 elements',
    samples: [
      { prompt: 'punchy trap kick drum with sub-heavy 808 tail', name: 'Trap Kick', suggestedTrack: 'track1' },
      { prompt: 'crisp trap snare with tight gate and high-end snap', name: 'Trap Snare', suggestedTrack: 'track2' },
      { prompt: 'rolling trap hi-hat pattern with triplet swing', name: 'Trap Hats', suggestedTrack: 'track3' },
      { prompt: 'distorted 808 bass drop with pitch bend and saturation', name: '808 Drop', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'house',
    name: 'House',
    description: 'Classic house grooves and dance elements',
    samples: [
      { prompt: 'four-on-the-floor house kick drum with warm compression', name: 'House Kick', suggestedTrack: 'track1' },
      { prompt: 'classic house clap with disco-style reverb tail', name: 'House Clap', suggestedTrack: 'track2' },
      { prompt: 'grooving house bass line with analog filter sweep', name: 'House Bass', suggestedTrack: 'track3' },
      { prompt: 'funky house stab chord with disco strings and brass', name: 'House Stab', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Atmospheric textures and ambient soundscapes',
    samples: [
      { prompt: 'soft ambient kick drum with ethereal reverb tail', name: 'Ambient Kick', suggestedTrack: 'track1' },
      { prompt: 'delicate ambient percussion with crystalline texture', name: 'Crystal Perc', suggestedTrack: 'track2' },
      { prompt: 'evolving ambient pad with warm analog synthesis', name: 'Warm Pad', suggestedTrack: 'track3' },
      { prompt: 'nature-inspired ambient texture with organic elements', name: 'Nature Texture', suggestedTrack: 'track4' },
    ]
  }
];

// Create a sample library item from a sample pack sample (for when user generates it)
export function createSampleFromPack(pack: SamplePack, sampleIndex: number, buffer: AudioBuffer): SampleLibraryItem {
  const sample = pack.samples[sampleIndex];
  return {
    id: rid(),
    name: sample.name,
    buffer,
    duration: buffer.duration,
    type: 'ai',
    prompt: sample.prompt,
    packId: pack.id,
    packName: pack.name
  };
}

// Get suggested track samples for quick setup
export function getSuggestedPackSamples(packId: string): { trackId: string; samples: SamplePack['samples'] }[] {
  const pack = SAMPLE_PACKS.find(p => p.id === packId);
  if (!pack) return [];

  const trackGroups: Record<string, SamplePack['samples']> = {};
  
  pack.samples.forEach(sample => {
    const trackId = sample.suggestedTrack || 'track1';
    if (!trackGroups[trackId]) {
      trackGroups[trackId] = [];
    }
    trackGroups[trackId].push(sample);
  });

  return Object.entries(trackGroups).map(([trackId, samples]) => ({
    trackId,
    samples
  }));
}