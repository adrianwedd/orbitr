import { useAudioStore } from '@/lib/audioStore'
import { act, renderHook } from '@testing-library/react'

describe('AudioStore Multi-Track Logic', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAudioStore())
    act(() => {
      // Clear all tracks
      result.current.tracks.forEach(track => {
        result.current.clearTrack(track.id)
      })
      result.current.setSelectedTrack('track1')
      result.current.setSelectedStep(null)
    })
  })

  describe('Track Management', () => {
    it('should have 4 default tracks with correct properties', () => {
      const { result } = renderHook(() => useAudioStore())
      
      expect(result.current.tracks).toHaveLength(4)
      
      const tracks = result.current.tracks
      expect(tracks[0]).toMatchObject({
        id: 'track1',
        name: 'O',
        radius: 180,
        color: '#ef4444',
        volume: 0.8,
        muted: false,
        solo: false,
      })
      
      expect(tracks[3]).toMatchObject({
        id: 'track4',
        name: 'I',
        radius: 90,
        color: '#f59e0b',
      })
    })

    it('should have 16 steps per track', () => {
      const { result } = renderHook(() => useAudioStore())
      
      result.current.tracks.forEach(track => {
        expect(track.steps).toHaveLength(16)
        track.steps.forEach((step, i) => {
          expect(step).toMatchObject({
            id: expect.any(String),
            active: false,
            gain: 0.9,
            prob: 1.0,
            prompt: '',
            buffer: null,
            name: `${track.name} ${i + 1}`,
          })
        })
      })
    })
  })

  describe('Multi-Track Step Operations', () => {
    it('should toggle steps on specific tracks', () => {
      const { result } = renderHook(() => useAudioStore())
      
      act(() => {
        result.current.toggleStepMulti('track1', 0)
        result.current.toggleStepMulti('track2', 0)
      })
      
      expect(result.current.tracks[0].steps[0].active).toBe(true)
      expect(result.current.tracks[1].steps[0].active).toBe(true)
      expect(result.current.tracks[2].steps[0].active).toBe(false)
      expect(result.current.tracks[3].steps[0].active).toBe(false)
    })

    it('should update step properties on specific tracks', () => {
      const { result } = renderHook(() => useAudioStore())
      
      act(() => {
        result.current.updateStepMulti('track2', 5, {
          gain: 0.5,
          prob: 0.8,
          prompt: 'test prompt'
        })
      })
      
      const step = result.current.tracks[1].steps[5]
      expect(step.gain).toBe(0.5)
      expect(step.prob).toBe(0.8)
      expect(step.prompt).toBe('test prompt')
      
      // Other tracks should be unchanged
      expect(result.current.tracks[0].steps[5].gain).toBe(0.9)
    })

    it('should clear steps on specific tracks', () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Set up a step first
      act(() => {
        result.current.updateStepMulti('track3', 2, {
          active: true,
          buffer: {} as AudioBuffer,
          name: 'custom name'
        })
      })
      
      // Verify it's set
      expect(result.current.tracks[2].steps[2].active).toBe(true)
      
      // Clear it
      act(() => {
        result.current.clearStepMulti('track3', 2)
      })
      
      const clearedStep = result.current.tracks[2].steps[2]
      expect(clearedStep.active).toBe(false)
      expect(clearedStep.buffer).toBe(null)
      expect(clearedStep.name).toBe('B 3') // Reset to default name
    })
  })

  describe('Track Control Operations', () => {
    it('should set track volume', () => {
      const { result } = renderHook(() => useAudioStore())
      
      act(() => {
        result.current.setTrackVolume('track2', 0.3)
      })
      
      expect(result.current.tracks[1].volume).toBe(0.3)
      // Other tracks unchanged
      expect(result.current.tracks[0].volume).toBe(0.8)
    })

    it('should mute/unmute tracks', () => {
      const { result } = renderHook(() => useAudioStore())
      
      act(() => {
        result.current.setTrackMute('track1', true)
      })
      
      expect(result.current.tracks[0].muted).toBe(true)
      
      act(() => {
        result.current.setTrackMute('track1', false)
      })
      
      expect(result.current.tracks[0].muted).toBe(false)
    })

    it('should handle solo logic correctly', () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Solo track 2
      act(() => {
        result.current.setTrackSolo('track2', true)
      })
      
      expect(result.current.tracks[1].solo).toBe(true)
      // All other tracks should not be solo
      expect(result.current.tracks[0].solo).toBe(false)
      expect(result.current.tracks[2].solo).toBe(false)
      expect(result.current.tracks[3].solo).toBe(false)
      
      // Solo a different track - should unsolo previous
      act(() => {
        result.current.setTrackSolo('track3', true)
      })
      
      expect(result.current.tracks[1].solo).toBe(false)
      expect(result.current.tracks[2].solo).toBe(true)
    })

    it('should clear entire tracks', () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Set up some steps
      act(() => {
        result.current.toggleStepMulti('track1', 0)
        result.current.toggleStepMulti('track1', 3)
        result.current.updateStepMulti('track1', 0, { buffer: {} as AudioBuffer })
      })
      
      // Verify steps are active
      expect(result.current.tracks[0].steps[0].active).toBe(true)
      expect(result.current.tracks[0].steps[3].active).toBe(true)
      
      // Clear track
      act(() => {
        result.current.clearTrack('track1')
      })
      
      // All steps should be inactive and cleared
      result.current.tracks[0].steps.forEach((step, i) => {
        expect(step.active).toBe(false)
        expect(step.buffer).toBe(null)
        expect(step.name).toBe(`O ${i + 1}`)
      })
    })
  })

  describe('Track Selection', () => {
    it('should manage selected track state', () => {
      const { result } = renderHook(() => useAudioStore())
      
      expect(result.current.selectedTrack).toBe('track1')
      
      act(() => {
        result.current.setSelectedTrack('track3')
      })
      
      expect(result.current.selectedTrack).toBe('track3')
    })

    it('should manage selected step state', () => {
      const { result } = renderHook(() => useAudioStore())
      
      expect(result.current.selectedStep).toBe(null)
      
      act(() => {
        result.current.setSelectedStep(5)
      })
      
      expect(result.current.selectedStep).toBe(5)
    })
  })

  describe('Legacy Compatibility', () => {
    it('should delegate legacy actions to selected track', () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Select track 2
      act(() => {
        result.current.setSelectedTrack('track2')
        result.current.toggleStep(7) // Legacy method
      })
      
      // Should affect track 2, step 7
      expect(result.current.tracks[1].steps[7].active).toBe(true)
      // Other tracks unaffected
      expect(result.current.tracks[0].steps[7].active).toBe(false)
    })

    it('should return correct track steps for legacy track getter', () => {
      const { result } = renderHook(() => useAudioStore())
      
      act(() => {
        result.current.setSelectedTrack('track3')
      })
      
      // Legacy track getter should return selected track steps
      const legacyTrack = result.current.track
      expect(legacyTrack).toBe(result.current.tracks[2].steps)
    })
  })
})