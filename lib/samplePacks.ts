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

// Expanded curated AI sample packs including Detroit/Berlin 90s vibes
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
  },
  {
    id: 'detroit',
    name: 'Detroit',
    description: 'Classic Detroit techno with Motor City soul and 90s analog warmth',
    samples: [
      { prompt: 'deep Detroit techno kick drum with sub-bass weight and analog punch, 90s style', name: 'Motor Kick', suggestedTrack: 'track1' },
      { prompt: 'vintage Detroit techno snare with metallic snap and reverb tail', name: 'Steel Snare', suggestedTrack: 'track2' },
      { prompt: 'Detroit-style analog bassline with TB-303 acid resonance and filter sweep', name: 'Motor Bass', suggestedTrack: 'track3' },
      { prompt: 'Detroit techno stab chord with analog strings and futuristic pads', name: 'Future Stab', suggestedTrack: 'track4' },
      { prompt: 'classic Detroit techno hi-hat pattern with analog drum machine feel', name: 'Motor Hats', suggestedTrack: 'track3' },
      { prompt: 'Detroit underground percussion loop with industrial metallic textures', name: 'Underground Perc', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'berlin',
    name: 'Berlin',
    description: 'Dark Berlin underground techno with 90s warehouse atmosphere',
    samples: [
      { prompt: 'hard Berlin techno kick drum with underground club punch and sub weight', name: 'Warehouse Kick', suggestedTrack: 'track1' },
      { prompt: 'sharp Berlin techno snare with digital distortion and warehouse reverb', name: 'Concrete Snare', suggestedTrack: 'track2' },
      { prompt: 'dark Berlin techno bassline with analog filter modulation and acid texture', name: 'Underground Bass', suggestedTrack: 'track3' },
      { prompt: 'Berlin-style techno pad with dark atmosphere and analog warmth', name: 'Dark Pad', suggestedTrack: 'track4' },
      { prompt: 'Berlin techno percussion with metallic industrial sounds and echo', name: 'Steel Perc', suggestedTrack: 'track2' },
      { prompt: 'haunting Berlin techno lead with analog synthesis and dark character', name: 'Shadow Lead', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'uk-garage',
    name: 'UK Garage',
    description: '90s UK garage with skippy beats and bass weight',
    samples: [
      { prompt: 'classic UK garage kick drum with sub-bass depth and punch', name: 'UKG Kick', suggestedTrack: 'track1' },
      { prompt: 'skippy UK garage snare with characteristic swing and reverb', name: 'Skip Snare', suggestedTrack: 'track2' },
      { prompt: 'UK garage hi-hat pattern with distinctive shuffle and swing timing', name: 'Shuffle Hats', suggestedTrack: 'track3' },
      { prompt: 'deep UK garage bassline with sub weight and characteristic wobble', name: 'Deep Bass', suggestedTrack: 'track4' },
      { prompt: 'UK garage vocal chop with characteristic pitch shift and reverb', name: 'Vocal Chop', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'chicago-house',
    name: 'Chicago House',
    description: 'Original Chicago house with 808 drums and classic stabs',
    samples: [
      { prompt: 'Chicago house 808 kick drum with sub-bass thump and vinyl warmth', name: 'Chi Kick', suggestedTrack: 'track1' },
      { prompt: 'classic Chicago house clap with reverb tail and disco flavor', name: 'Chi Clap', suggestedTrack: 'track2' },
      { prompt: 'Chicago house hi-hat pattern with analog drum machine swing', name: 'Chi Hats', suggestedTrack: 'track3' },
      { prompt: 'iconic Chicago house piano stab with gospel chord progression', name: 'Piano Stab', suggestedTrack: 'track4' },
      { prompt: 'Chicago house bassline with analog filter and groove', name: 'Chi Bass', suggestedTrack: 'track3' },
    ]
  },
  {
    id: 'jungle',
    name: 'Jungle',
    description: '90s jungle with chopped breaks and sub-bass',
    samples: [
      { prompt: 'jungle kick drum with sub-bass depth and analog punch', name: 'Jungle Kick', suggestedTrack: 'track1' },
      { prompt: 'chopped jungle snare from Amen break with distortion', name: 'Amen Snare', suggestedTrack: 'track2' },
      { prompt: 'rapid jungle hi-hat pattern with breakbeat timing', name: 'Break Hats', suggestedTrack: 'track3' },
      { prompt: 'deep jungle bassline with wobble and sub frequencies', name: 'Sub Bass', suggestedTrack: 'track4' },
      { prompt: 'jungle vocal sample with ragga style and reverb', name: 'Ragga Vocal', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'drum-n-bass',
    name: 'Drum & Bass',
    description: 'Liquid and hard D&B with tight breaks',
    samples: [
      { prompt: 'drum and bass kick with tight punch and sub-bass weight', name: 'DnB Kick', suggestedTrack: 'track1' },
      { prompt: 'crisp drum and bass snare with electronic processing', name: 'DnB Snare', suggestedTrack: 'track2' },
      { prompt: 'fast drum and bass hi-hat with liquid groove', name: 'Liquid Hats', suggestedTrack: 'track3' },
      { prompt: 'rolling drum and bass bassline with neuro modulation', name: 'Neuro Bass', suggestedTrack: 'track4' },
      { prompt: 'atmospheric drum and bass pad with ambient texture', name: 'Liquid Pad', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'breakbeat',
    name: 'Breakbeat',
    description: 'Classic breakbeat with funky breaks and samples',
    samples: [
      { prompt: 'breakbeat kick drum with analog punch and vinyl character', name: 'Break Kick', suggestedTrack: 'track1' },
      { prompt: 'funky breakbeat snare with classic break sampling', name: 'Funky Snare', suggestedTrack: 'track2' },
      { prompt: 'breakbeat hi-hat pattern with shuffle and swing', name: 'Shuffle Break', suggestedTrack: 'track3' },
      { prompt: 'breakbeat bassline with funk groove and analog warmth', name: 'Funk Bass', suggestedTrack: 'track4' },
      { prompt: 'breakbeat vocal chop with hip-hop flavor', name: 'Break Vocal', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'acid',
    name: 'Acid',
    description: 'TB-303 acid sounds with squelchy resonance',
    samples: [
      { prompt: 'acid kick drum with sub-bass and analog character', name: 'Acid Kick', suggestedTrack: 'track1' },
      { prompt: 'acid snare with metallic ring and reverb', name: 'Acid Snare', suggestedTrack: 'track2' },
      { prompt: 'TB-303 acid bassline with resonant filter sweeps', name: '303 Bass', suggestedTrack: 'track3' },
      { prompt: 'acid lead with squelchy 303 modulation and distortion', name: 'Acid Lead', suggestedTrack: 'track4' },
      { prompt: 'acid percussion with metallic textures', name: 'Acid Perc', suggestedTrack: 'track2' },
    ]
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Minimal techno with subtle textures and space',
    samples: [
      { prompt: 'minimal techno kick with deep sub and clean attack', name: 'Min Kick', suggestedTrack: 'track1' },
      { prompt: 'minimal techno snare with subtle reverb and space', name: 'Min Snare', suggestedTrack: 'track2' },
      { prompt: 'minimal techno hi-hat with precise timing and texture', name: 'Min Hats', suggestedTrack: 'track3' },
      { prompt: 'minimal techno bassline with subtle modulation', name: 'Min Bass', suggestedTrack: 'track4' },
      { prompt: 'minimal percussion with organic texture and space', name: 'Min Perc', suggestedTrack: 'track3' },
    ]
  },
  {
    id: 'dub',
    name: 'Dub',
    description: 'Dub techno with deep echoes and analog warmth',
    samples: [
      { prompt: 'dub techno kick with deep sub-bass and analog warmth', name: 'Dub Kick', suggestedTrack: 'track1' },
      { prompt: 'dub techno snare with tape delay and reverb', name: 'Dub Snare', suggestedTrack: 'track2' },
      { prompt: 'dub techno hi-hat with analog delay and modulation', name: 'Dub Hats', suggestedTrack: 'track3' },
      { prompt: 'dub techno chord with analog delay and filtering', name: 'Dub Chord', suggestedTrack: 'track4' },
      { prompt: 'dub techno bass with deep sub and analog character', name: 'Dub Bass', suggestedTrack: 'track3' },
    ]
  },
  {
    id: 'trance',
    name: 'Trance',
    description: 'Classic trance with emotional leads and pumping beats',
    samples: [
      { prompt: 'trance kick drum with pumping compression and sub-bass', name: 'Trance Kick', suggestedTrack: 'track1' },
      { prompt: 'trance snare with gated reverb and emotional character', name: 'Trance Snare', suggestedTrack: 'track2' },
      { prompt: 'trance hi-hat with driving rhythm and analog feel', name: 'Trance Hats', suggestedTrack: 'track3' },
      { prompt: 'emotional trance lead with supersaw and reverb', name: 'Trance Lead', suggestedTrack: 'track4' },
      { prompt: 'trance pluck with analog filtering and modulation', name: 'Trance Pluck', suggestedTrack: 'track4' },
    ]
  },
  {
    id: 'experimental',
    name: 'Experimental',
    description: 'Avant-garde sounds and unconventional textures',
    samples: [
      { prompt: 'experimental kick with granular synthesis and texture', name: 'Exp Kick', suggestedTrack: 'track1' },
      { prompt: 'glitchy experimental snare with digital artifacts', name: 'Glitch Snare', suggestedTrack: 'track2' },
      { prompt: 'experimental texture with field recording and processing', name: 'Field Texture', suggestedTrack: 'track3' },
      { prompt: 'abstract experimental sound with spectral processing', name: 'Abstract Sound', suggestedTrack: 'track4' },
      { prompt: 'experimental percussion with found sounds and effects', name: 'Found Perc', suggestedTrack: 'track2' },
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