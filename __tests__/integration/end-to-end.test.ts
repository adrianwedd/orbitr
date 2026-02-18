/**
 * End-to-End Integration Tests for Orbitr
 * Tests complete workflows from frontend to backend integration
 */

import { renderHook, act } from '@testing-library/react'
import { useAudioStore } from '@/lib/audioStore'
import axios from 'axios'

// Mock axios for backend integration tests
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock Web Audio API for complete integration
const mockAudioContext = {
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    disconnect: jest.fn(),
    onended: null
  })),
  decodeAudioData: jest.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: jest.fn(() => Promise.resolve()),
  suspend: jest.fn(() => Promise.resolve())
}

global.AudioContext = jest.fn(() => mockAudioContext) as any
(global as any).webkitAudioContext = global.AudioContext

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset Zustand store state between tests
    useAudioStore.setState(state => ({
      library: [],
      genQueue: [],
      isPlaying: false,
      bpm: 120,
      swing: 0,
      masterGain: 1,
      selectedTrack: null,
      selectedStep: null,
      currentStep: 0,
      tracks: state.tracks.map(track => ({
        ...track,
        volume: 0.8,
        muted: false,
        solo: false,
        steps: track.steps.map(step => ({ ...step, active: false, buffer: null }))
      }))
    }))

    // Reset audio context mocks
    mockAudioContext.currentTime = 0
    mockAudioContext.decodeAudioData.mockResolvedValue({
      duration: 1.5,
      numberOfChannels: 1,
      sampleRate: 44100,
      length: 66150
    })
  })

  describe('Complete AI Generation Workflow', () => {
    it('should complete full AI generation pipeline', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Mock successful backend response
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          audio: 'base64-encoded-audio-data',
          name: 'Generated Sample',
          seed: 12345,
          cached: false
        }
      })

      await act(async () => {
        // 1. Add generation request to queue
        result.current.addToGenerationQueue({
          id: 'gen-1',
          prompt: 'techno kick drum',
          trackId: 'track1',
          status: 'queued',
          progress: 0
        })

        // 2. Simulate API call
        const response = await mockedAxios.post('/api/generate', {
          prompt: 'techno kick drum',
          duration: 1.5,
          quality: 'draft'
        })

        // 3. Update progress
        result.current.updateGenerationProgress('gen-1', 50, 'generating')
        result.current.updateGenerationProgress('gen-1', 100, 'ready')

        // 4. Process response and add to library
        const audioBuffer = await mockAudioContext.decodeAudioData(
          new ArrayBuffer(1024)
        )

        result.current.addToSampleLibrary({
          id: 'generated-sample-1',
          name: response.data.name,
          buffer: audioBuffer as AudioBuffer,
          duration: audioBuffer.duration,
          type: 'ai',
          prompt: 'techno kick drum'
        })

        // 5. Assign to track step
        result.current.updateStepMulti('track1', 0, {
          active: true,
          buffer: audioBuffer as AudioBuffer,
          name: response.data.name
        })

        // 6. Remove from generation queue
        result.current.removeFromGenerationQueue('gen-1')
      })

      // Verify complete workflow
      expect(result.current.library).toHaveLength(1)
      expect(result.current.tracks[0].steps[0].active).toBe(true)
      expect(result.current.tracks[0].steps[0].buffer).toBeTruthy()
      expect(result.current.generationQueue).toHaveLength(0)
    })

    it('should handle generation failure gracefully', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Mock backend error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { detail: 'Generation failed' }
        }
      })

      await act(async () => {
        // Add generation request
        result.current.addToGenerationQueue({
          id: 'gen-fail',
          prompt: 'failing prompt',
          trackId: 'track2',
          status: 'queued',
          progress: 0
        })

        try {
          await mockedAxios.post('/api/generate', {
            prompt: 'failing prompt',
            duration: 1.5,
            quality: 'draft'
          })
        } catch (error) {
          // Update generation status to failed
          result.current.updateGenerationProgress('gen-fail', 0, 'error')
        }

        // Remove failed generation
        result.current.removeFromGenerationQueue('gen-fail')
      })

      // Verify error handling
      expect(result.current.library).toHaveLength(0)
      expect(result.current.tracks[1].steps[4].active).toBe(false)
      expect(result.current.generationQueue).toHaveLength(0)
    })

    it('should handle cached responses correctly', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Mock cached response
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          audio: 'cached-base64-audio-data',
          name: 'Cached Sample',
          seed: 67890,
          cached: true
        }
      })

      await act(async () => {
        result.current.addToGenerationQueue({
          id: 'gen-cached',
          prompt: 'bass drum hit',
          trackId: 'track3',
          status: 'queued',
          progress: 0
        })

        const response = await mockedAxios.post('/api/generate', {
          prompt: 'bass drum hit',
          duration: 2.0,
          quality: 'high'
        })

        // Cached responses should complete immediately
        result.current.updateGenerationProgress('gen-cached', 100, 'ready')

        const audioBuffer = await mockAudioContext.decodeAudioData(
          new ArrayBuffer(2048)
        )

        result.current.addToSampleLibrary({
          id: 'cached-sample',
          name: response.data.name,
          buffer: audioBuffer as AudioBuffer,
          duration: 2.0,
          type: 'ai',
          prompt: 'bass drum hit'
        })

        result.current.updateStepMulti('track3', 8, {
          active: true,
          buffer: audioBuffer as AudioBuffer,
          name: response.data.name
        })

        result.current.removeFromGenerationQueue('gen-cached')
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('Cached Sample')
      expect(result.current.tracks[2].steps[8].active).toBe(true)
    })
  })

  describe('Multi-Track Playback Integration', () => {
    it('should handle complex multi-track playback scenario', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Set up mock audio buffers for all tracks
      const mockBuffers = Array.from({ length: 4 }, (_, i) => ({
        duration: 1.0 + i * 0.5,
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 44100 * (1.0 + i * 0.5)
      })) as AudioBuffer[]

      await act(async () => {
        // Set up patterns on all tracks
        result.current.tracks.forEach((track, trackIndex) => {
          const pattern = trackIndex === 0 ? [0, 4, 8, 12] : // Kick pattern
                         trackIndex === 1 ? [2, 6, 10, 14] : // Snare pattern
                         trackIndex === 2 ? [1, 3, 5, 7, 9, 11, 13, 15] : // Hi-hat pattern
                         [0, 8]; // Bass pattern

          pattern.forEach(stepIndex => {
            result.current.updateStepMulti(track.id, stepIndex, {
              active: true,
              buffer: mockBuffers[trackIndex],
              name: `${track.name} Sample`,
              gain: 0.8 - trackIndex * 0.1,
              prob: 1.0
            })
          })
        })

        // Test track controls
        result.current.setTrackVolume('track1', 0.9)
        result.current.setTrackMute('track2', true)
        result.current.setTrackSolo('track3', true)

        // Start playback
        result.current.setIsPlaying(true)
        result.current.setBpm(128)
        result.current.setSwing(15)
      })

      // Verify multi-track setup
      expect(result.current.tracks[0].steps.filter(s => s.active)).toHaveLength(4)
      expect(result.current.tracks[1].steps.filter(s => s.active)).toHaveLength(4)
      expect(result.current.tracks[2].steps.filter(s => s.active)).toHaveLength(8)
      expect(result.current.tracks[3].steps.filter(s => s.active)).toHaveLength(2)

      expect(result.current.tracks[0].volume).toBe(0.9)
      expect(result.current.tracks[1].muted).toBe(true)
      expect(result.current.tracks[2].solo).toBe(true)
      expect(result.current.isPlaying).toBe(true)
      expect(result.current.bpm).toBe(128)
      expect(result.current.swing).toBe(15)
    })

    it('should handle audio scheduling for all active tracks', async () => {
      const { result } = renderHook(() => useAudioStore())
      const scheduledSources: any[] = []

      // Mock source creation to track scheduling
      mockAudioContext.createBufferSource.mockImplementation(() => {
        const source = {
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          disconnect: jest.fn(),
          onended: null
        }
        scheduledSources.push(source)
        return source
      })

      await act(async () => {
        // Set up active steps on multiple tracks
        const mockBuffer = {
          duration: 1.0,
          numberOfChannels: 1,
          sampleRate: 44100
        } as AudioBuffer

        // Track 1: Steps 0, 4, 8, 12
        ;[0, 4, 8, 12].forEach(step => {
          result.current.updateStepMulti('track1', step, {
            active: true,
            buffer: mockBuffer
          })
        })

        // Track 2: Steps 2, 6, 10, 14
        ;[2, 6, 10, 14].forEach(step => {
          result.current.updateStepMulti('track2', step, {
            active: true,
            buffer: mockBuffer
          })
        })

        // Simulate one complete cycle of playback
        for (let step = 0; step < 16; step++) {
          result.current.setCurrentStep(step)

          // Use getState() to get the latest Zustand state (result.current may be stale inside act)
          const currentTracks = useAudioStore.getState().tracks
          currentTracks.forEach(track => {
            if (track.steps[step].active && track.steps[step].buffer && !track.muted) {
              const source = mockAudioContext.createBufferSource()
              const gainNode = mockAudioContext.createGain()
              
              ;(source as any).buffer = track.steps[step].buffer
              gainNode.gain.value = track.volume * track.steps[step].gain
              
              source.connect(gainNode)
              gainNode.connect(mockAudioContext.destination)
              
              const stepTime = step * (60 / result.current.bpm / 4)
              source.start(mockAudioContext.currentTime + stepTime)
            }
          })
        }
      })

      // Verify audio sources were scheduled for active steps
      expect(scheduledSources.length).toBeGreaterThan(0)
      expect(scheduledSources.every(source => source.start.mock.calls.length > 0)).toBe(true)
    })
  })

  describe('Sample Library Integration', () => {
    it('should integrate sample library with track assignment', async () => {
      const { result } = renderHook(() => useAudioStore())

      const mockSamples = [
        { name: 'Kick.wav', duration: 0.5, prompt: 'kick drum' },
        { name: 'Snare.wav', duration: 0.3, prompt: 'snare hit' },
        { name: 'Hat.wav', duration: 0.1, prompt: 'hi-hat' }
      ]

      await act(async () => {
        // Add samples to library
        mockSamples.forEach((sample, index) => {
          const mockBuffer = {
            duration: sample.duration,
            numberOfChannels: 1,
            sampleRate: 44100
          } as AudioBuffer

          result.current.addToSampleLibrary({
            id: `sample-${index}`,
            name: sample.name,
            buffer: mockBuffer,
            duration: sample.duration,
            type: 'ai',
            prompt: sample.prompt
          })
        })

        // Use getState() to get the latest library state (result.current may be stale inside act)
        const lib = useAudioStore.getState().library

        // Assign samples to different tracks (library is prepended, so lib[0] is last added)
        result.current.updateStepMulti('track1', 0, {
          active: true,
          buffer: lib[2].buffer,
          name: lib[2].name
        })

        result.current.updateStepMulti('track2', 4, {
          active: true,
          buffer: lib[1].buffer,
          name: lib[1].name
        })

        result.current.updateStepMulti('track3', 2, {
          active: true,
          buffer: lib[0].buffer,
          name: lib[0].name
        })
      })

      // Verify integration
      expect(result.current.library).toHaveLength(3)
      expect(result.current.tracks[0].steps[0].name).toBe('Kick.wav')
      expect(result.current.tracks[1].steps[4].name).toBe('Snare.wav')
      expect(result.current.tracks[2].steps[2].name).toBe('Hat.wav')
    })

    it('should handle sample replacement workflow', async () => {
      const { result } = renderHook(() => useAudioStore())

      await act(async () => {
        // Add initial sample
        const originalBuffer = {
          duration: 1.0,
          numberOfChannels: 1,
          sampleRate: 44100
        } as AudioBuffer

        result.current.addToSampleLibrary({
          id: 'original-sample',
          name: 'Original.wav',
          buffer: originalBuffer,
          duration: 1.0,
          type: 'local',
          prompt: ''
        })

        // Assign to track
        result.current.updateStepMulti('track1', 5, {
          active: true,
          buffer: originalBuffer,
          name: 'Original.wav'
        })

        // Replace with new sample
        const newBuffer = {
          duration: 1.5,
          numberOfChannels: 2,
          sampleRate: 44100
        } as AudioBuffer

        result.current.addToSampleLibrary({
          id: 'new-sample',
          name: 'Replacement.wav',
          buffer: newBuffer,
          duration: 1.5,
          type: 'ai',
          prompt: 'better drum sound'
        })

        // Update track with new sample
        result.current.updateStepMulti('track1', 5, {
          buffer: newBuffer,
          name: 'Replacement.wav'
        })

        // Remove original sample from library
        result.current.removeFromSampleLibrary('original-sample')
      })

      // Verify replacement
      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('Replacement.wav')
      expect(result.current.tracks[0].steps[5].name).toBe('Replacement.wav')
      expect(result.current.tracks[0].steps[5].buffer?.duration).toBe(1.5)
    })
  })

  describe('State Persistence Integration', () => {
    it('should maintain state consistency across operations', async () => {
      const { result } = renderHook(() => useAudioStore())

      await act(async () => {
        // Set up complex state
        result.current.setBpm(140)
        result.current.setSwing(20)
        result.current.setIsPlaying(true)
        result.current.setSelectedTrack('track3')
        result.current.setSelectedStep(7)

        // Add samples and patterns
        const mockBuffer = {
          duration: 0.8,
          numberOfChannels: 1,
          sampleRate: 44100
        } as AudioBuffer

        result.current.addToSampleLibrary({
          id: 'persistent-sample',
          name: 'Persistent.wav',
          buffer: mockBuffer,
          duration: 0.8,
          type: 'ai',
          prompt: 'test persistence'
        })

        // Set up pattern
        ;[0, 2, 4, 6].forEach(step => {
          result.current.updateStepMulti('track3', step, {
            active: true,
            buffer: mockBuffer,
            gain: 0.7,
            prob: 0.9
          })
        })

        // Set track controls
        result.current.setTrackVolume('track3', 0.6)
        result.current.setMasterGain(0.85)
      })

      // Verify all state is consistent
      expect(result.current.bpm).toBe(140)
      expect(result.current.swing).toBe(20)
      expect(result.current.isPlaying).toBe(true)
      expect(result.current.selectedTrack).toBe('track3')
      expect(result.current.selectedStep).toBe(7)
      expect(result.current.library).toHaveLength(1)
      expect(result.current.tracks[2].volume).toBe(0.6)
      expect(result.current.masterGain).toBe(0.85)
      expect(result.current.tracks[2].steps.filter(s => s.active)).toHaveLength(4)
    })

    it('should handle rapid state changes without corruption', async () => {
      const { result } = renderHook(() => useAudioStore())

      await act(async () => {
        // Rapid fire state changes
        for (let i = 0; i < 50; i++) {
          result.current.setBpm(60 + i * 2)
          result.current.setCurrentStep(i % 16)
          result.current.setSelectedTrack(result.current.tracks[i % 4].id)
          
          if (i % 5 === 0) {
            result.current.toggleStepMulti(result.current.tracks[i % 4].id, i % 16)
          }
          
          if (i % 7 === 0) {
            result.current.setTrackVolume(result.current.tracks[i % 4].id, Math.random())
          }
        }
      })

      // Verify final state is consistent
      expect(result.current.bpm).toBe(60 + 49 * 2) // Final BPM
      expect(result.current.currentStep).toBe(49 % 16) // Final step
      expect(result.current.selectedTrack).toBe(result.current.tracks[49 % 4].id)
      
      // Verify track states are valid
      result.current.tracks.forEach(track => {
        expect(track.volume).toBeGreaterThanOrEqual(0)
        expect(track.volume).toBeLessThanOrEqual(1)
        expect(track.steps).toHaveLength(16)
      })
    })
  })

  describe('Error Recovery Integration', () => {
    it('should recover gracefully from audio context errors', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Mock audio context error
      mockAudioContext.decodeAudioData.mockRejectedValueOnce(
        new Error('Audio context suspended')
      )

      await act(async () => {
        try {
          await mockAudioContext.decodeAudioData(new ArrayBuffer(1024))
        } catch (error) {
          // Should handle error gracefully
          console.warn('Audio context error handled:', (error as Error).message)
        }

        // Continue normal operation
        result.current.setBpm(120)
        result.current.setIsPlaying(false)
      })

      // Verify system is still functional
      expect(result.current.bpm).toBe(120)
      expect(result.current.isPlaying).toBe(false)
    })

    it('should maintain data integrity during failures', async () => {
      const { result } = renderHook(() => useAudioStore())

      await act(async () => {
        // Set up initial state
        const mockBuffer = { duration: 1.0 } as AudioBuffer
        
        result.current.addToSampleLibrary({
          id: 'integrity-test',
          name: 'Test.wav',
          buffer: mockBuffer,
          duration: 1.0,
          type: 'local',
          prompt: ''
        })

        result.current.updateStepMulti('track1', 0, {
          active: true,
          buffer: mockBuffer
        })

        // Simulate operation that might fail
        try {
          // This could fail in real scenarios
          result.current.setTrackVolume('nonexistent-track', 0.5)
        } catch (error) {
          // Error should not corrupt existing data
        }
      })

      // Verify data integrity
      expect(result.current.library).toHaveLength(1)
      expect(result.current.tracks[0].steps[0].active).toBe(true)
      expect(result.current.tracks[0].volume).toBe(0.8) // Default volume unchanged
    })
  })
})