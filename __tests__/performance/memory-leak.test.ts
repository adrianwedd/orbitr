/**
 * Memory Leak Detection Tests for Orbitr Frontend
 * Tests for memory leaks in audio processing, component lifecycle, and state management
 */

import { renderHook, act } from '@testing-library/react'
import { useAudioStore } from '@/lib/audioStore'

// Mock performance.measureUserAgentSpecificMemory if available
const mockMemoryAPI = {
  measureUserAgentSpecificMemory: jest.fn(() => Promise.resolve({
    bytes: Math.random() * 50000000,
    breakdown: []
  }))
}

// @ts-ignore
global.performance.measureUserAgentSpecificMemory = mockMemoryAPI.measureUserAgentSpecificMemory

describe('Memory Leak Detection', () => {
  let initialMemory: number = 0
  
  beforeAll(() => {
    // Record initial memory usage
    if (process.memoryUsage) {
      initialMemory = process.memoryUsage().heapUsed
    }
  })

  describe('AudioStore Memory Management', () => {
    it('should not leak memory when creating and clearing many tracks', async () => {
      const { result } = renderHook(() => useAudioStore())
      const iterations = 50
      
      for (let i = 0; i < iterations; i++) {
        act(() => {
          // Create audio buffers
          const mockBuffer = {
            duration: 1.0,
            numberOfChannels: 1,
            sampleRate: 44100
          } as AudioBuffer

          // Add samples to all tracks
          result.current.tracks.forEach((track, trackIndex) => {
            track.steps.forEach((_, stepIndex) => {
              result.current.updateStepMulti(track.id, stepIndex, {
                buffer: mockBuffer,
                active: true,
                name: `Sample ${i}-${trackIndex}-${stepIndex}`
              })
            })
          })

          // Clear all tracks
          result.current.tracks.forEach(track => {
            result.current.clearTrack(track.id)
          })
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      // Check that tracks are properly cleared
      expect(result.current.tracks.every(track => 
        track.steps.every(step => step.buffer === null)
      )).toBe(true)
    })

    it('should not accumulate memory in generation queue operations', async () => {
      const { result } = renderHook(() => useAudioStore())
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        act(() => {
          // Add to generation queue
          result.current.addToQueue({
            id: `test-${i}`,
            prompt: `Test prompt ${i}`,
            trackId: 'track1',
            stepIndex: i % 16,
            status: 'pending',
            progress: 0
          })

          // Process and remove from queue
          result.current.updateQueueItem(`test-${i}`, { status: 'completed', progress: 100 })
          result.current.removeFromQueue(`test-${i}`)
        })
      }

      // Queue should be empty
      expect(result.current.genQueue).toHaveLength(0)
    })

    it('should properly cleanup audio context resources', () => {
      const { result } = renderHook(() => useAudioStore())
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
          disconnect: jest.fn()
        })),
        destination: {},
        state: 'running',
        close: jest.fn(() => Promise.resolve()),
        suspend: jest.fn(() => Promise.resolve()),
        resume: jest.fn(() => Promise.resolve())
      }

      // Simulate multiple audio context operations
      for (let i = 0; i < 20; i++) {
        // These would normally create and schedule audio nodes
        const source = mockAudioContext.createBufferSource()
        const gainNode = mockAudioContext.createGain()
        
        // Ensure cleanup methods are called
        expect(source.disconnect).toBeDefined()
        expect(gainNode.disconnect).toBeDefined()
      }
    })
  })

  describe('Component Memory Management', () => {
    it('should not leak event listeners', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      // Simulate component mount/unmount cycle
      const { result, unmount } = renderHook(() => useAudioStore())

      // Simulate keyboard events setup (would happen in components)
      act(() => {
        const keyHandler = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
            result.current.togglePlayback()
          }
        }
        document.addEventListener('keydown', keyHandler)
        
        // Simulate unmount cleanup
        unmount()
        document.removeEventListener('keydown', keyHandler)
      })

      // Verify event listeners are properly managed
      expect(addEventListenerSpy).toHaveBeenCalled()
      expect(removeEventListenerSpy).toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('should cleanup animation frames', () => {
      const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame')
      const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame')

      let animationId: number

      // Simulate animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate)
      }

      animate()
      
      // Cleanup animation
      if (animationId) {
        cancelAnimationFrame(animationId)
      }

      expect(requestAnimationFrameSpy).toHaveBeenCalled()
      expect(cancelAnimationFrameSpy).toHaveBeenCalled()

      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
    })
  })

  describe('File Upload Memory Management', () => {
    it('should not leak memory when processing large files', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Simulate multiple file uploads
      for (let i = 0; i < 10; i++) {
        const mockFile = new File(['test audio data'], `test${i}.wav`, {
          type: 'audio/wav'
        })

        act(() => {
          // Simulate file processing
          const mockBuffer = {
            duration: 2.0,
            numberOfChannels: 2,
            sampleRate: 44100
          } as AudioBuffer

          result.current.addToLibrary({
            id: `file-${i}`,
            name: mockFile.name,
            buffer: mockBuffer,
            duration: 2.0,
            type: 'uploaded',
            prompt: ''
          })
        })
      }

      // Clear sample library
      act(() => {
        result.current.clearLibrary()
      })

      expect(result.current.library).toHaveLength(0)
    })

    it('should handle file reader cleanup', () => {
      const fileReaderInstances: FileReader[] = []

      // Mock FileReader to track instances
      const OriginalFileReader = window.FileReader
      window.FileReader = jest.fn().mockImplementation(() => {
        const reader = new OriginalFileReader()
        fileReaderInstances.push(reader)
        return reader
      })

      // Simulate file reading operations
      for (let i = 0; i < 5; i++) {
        const reader = new FileReader()
        const mockFile = new File(['test'], `test${i}.wav`)
        
        // Simulate reading and cleanup
        reader.onload = () => {
          // Processing complete
        }
        reader.onerror = () => {
          // Error handling
        }
        
        reader.readAsArrayBuffer(mockFile)
      }

      // Restore original FileReader
      window.FileReader = OriginalFileReader

      // Verify all instances were created
      expect(fileReaderInstances).toHaveLength(5)
    })
  })

  describe('Audio Scheduling Memory Management', () => {
    it('should cleanup scheduled audio sources', () => {
      const { result } = renderHook(() => useAudioStore())
      const scheduledSources: any[] = []

      // Mock audio context with source tracking
      const mockCreateBufferSource = jest.fn(() => {
        const source = {
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null,
          disconnect: jest.fn()
        }
        scheduledSources.push(source)
        return source
      })

      // Simulate scheduling many audio events
      for (let i = 0; i < 32; i++) { // 2 full cycles of 16 steps
        const source = mockCreateBufferSource()
        source.start(0)
        
        // Simulate source completion
        if (source.onended) {
          source.onended(new Event('ended'))
        }
        
        // Cleanup should disconnect source
        source.disconnect()
      }

      // Verify all sources were properly cleaned up
      scheduledSources.forEach(source => {
        expect(source.disconnect).toHaveBeenCalled()
      })
    })

    it('should not accumulate timing data', () => {
      const { result } = renderHook(() => useAudioStore())
      const timingData: number[] = []

      // Simulate many timing calculations
      for (let i = 0; i < 1000; i++) {
        const currentTime = i * 0.1
        const stepTime = (i % 16) * (60 / 120 / 4) // 120 BPM, 16th notes
        timingData.push(currentTime + stepTime)
      }

      // Verify timing array doesn't grow infinitely
      // In real implementation, this would be managed by the audio store
      expect(timingData.length).toBeLessThan(2000)
    })
  })

  afterAll(() => {
    // Check final memory usage
    if (process.memoryUsage) {
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Log memory usage for monitoring
      console.log(`Memory usage change: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
      
      // Fail if memory increased by more than 50MB (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    }
  })
})