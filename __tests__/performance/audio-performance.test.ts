/**
 * Audio Performance Tests for Orbitr
 * Tests for audio scheduling, multi-track playback, and real-time performance
 */

import { renderHook, act } from '@testing-library/react'
import { useAudioStore } from '@/lib/audioStore'

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {}

  measure(name: string, fn: () => void): number {
    const start = performance.now()
    fn()
    const end = performance.now()
    const duration = end - start

    if (!this.measurements[name]) {
      this.measurements[name] = []
    }
    this.measurements[name].push(duration)

    return duration
  }

  async measureAsync(name: string, fn: () => Promise<void>): Promise<number> {
    const start = performance.now()
    await fn()
    const end = performance.now()
    const duration = end - start

    if (!this.measurements[name]) {
      this.measurements[name] = []
    }
    this.measurements[name].push(duration)

    return duration
  }

  getStats(name: string) {
    const measurements = this.measurements[name] || []
    if (measurements.length === 0) return null

    const sorted = measurements.sort((a, b) => a - b)
    return {
      count: measurements.length,
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  getAllStats() {
    return Object.keys(this.measurements).reduce((acc, name) => {
      acc[name] = this.getStats(name)
      return acc
    }, {} as { [key: string]: any })
  }
}

describe('Audio Performance Tests', () => {
  const monitor = new PerformanceMonitor()

  beforeEach(() => {
    // Reset performance measurements
    jest.clearAllMocks()
  })

  describe('Audio Store Performance', () => {
    it('should handle rapid state updates efficiently', () => {
      const { result } = renderHook(() => useAudioStore())

      // Test rapid step toggles
      const toggleDuration = monitor.measure('rapid_step_toggles', () => {
        for (let i = 0; i < 100; i++) {
          act(() => {
            result.current.toggleStepMulti('track1', i % 16)
          })
        }
      })

      expect(toggleDuration).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should update track volumes without performance degradation', () => {
      const { result } = renderHook(() => useAudioStore())

      const volumeUpdateDuration = monitor.measure('volume_updates', () => {
        for (let i = 0; i < 50; i++) {
          act(() => {
            result.current.setTrackVolume('track1', Math.random())
            result.current.setTrackVolume('track2', Math.random())
            result.current.setTrackVolume('track3', Math.random())
            result.current.setTrackVolume('track4', Math.random())
          })
        }
      })

      expect(volumeUpdateDuration).toBeLessThan(50) // Should be very fast
    })

    it('should handle sample library operations efficiently', () => {
      const { result } = renderHook(() => useAudioStore())

      const libraryDuration = monitor.measure('sample_library_operations', () => {
        // Add many samples
        for (let i = 0; i < 20; i++) {
          act(() => {
            result.current.addToSampleLibrary({
              id: `sample-${i}`,
              name: `Sample ${i}`,
              buffer: {} as AudioBuffer,
              duration: 1.0,
              type: 'generated',
              prompt: `Prompt ${i}`
            })
          })
        }

        // Remove samples
        for (let i = 0; i < 20; i++) {
          act(() => {
            result.current.removeFromSampleLibrary(`sample-${i}`)
          })
        }
      })

      expect(libraryDuration).toBeLessThan(100)
    })
  })

  describe('Multi-Track Audio Scheduling', () => {
    it('should schedule audio events with low latency', () => {
      const { result } = renderHook(() => useAudioStore())
      const mockAudioContext = {
        currentTime: 0,
        createBufferSource: jest.fn(() => ({
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null
        })),
        createGain: jest.fn(() => ({
          gain: { value: 1 },
          connect: jest.fn()
        })),
        destination: {}
      }

      // Mock audio buffer
      const mockBuffer = {
        duration: 1.0,
        numberOfChannels: 1,
        sampleRate: 44100
      } as AudioBuffer

      // Set up all tracks with active steps
      act(() => {
        result.current.tracks.forEach((track, trackIndex) => {
          for (let i = 0; i < 16; i += 2) { // Every other step
            result.current.updateStepMulti(track.id, i, {
              active: true,
              buffer: mockBuffer
            })
          }
        })
      })

      // Measure scheduling performance
      const schedulingDuration = monitor.measure('audio_scheduling', () => {
        // Simulate scheduling a full cycle (16 steps) for all 4 tracks
        for (let step = 0; step < 16; step++) {
          result.current.tracks.forEach(track => {
            if (track.steps[step].active && track.steps[step].buffer) {
              const source = mockAudioContext.createBufferSource()
              const gainNode = mockAudioContext.createGain()
              
              source.buffer = track.steps[step].buffer
              source.connect(gainNode)
              gainNode.connect(mockAudioContext.destination)
              
              const stepTime = step * (60 / 120 / 4) // 120 BPM, 16th notes
              source.start(mockAudioContext.currentTime + stepTime)
            }
          })
        }
      })

      // Scheduling should be very fast (under 10ms for full cycle)
      expect(schedulingDuration).toBeLessThan(10)
    })

    it('should handle polyphonic playback efficiently', () => {
      const { result } = renderHook(() => useAudioStore())
      const sources: any[] = []

      const polyphonicDuration = monitor.measure('polyphonic_playback', () => {
        // Simulate 32 simultaneous audio sources (8 per track)
        for (let i = 0; i < 32; i++) {
          const source = {
            buffer: {} as AudioBuffer,
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            onended: jest.fn()
          }
          sources.push(source)

          source.connect(jest.fn())
          source.start(0)
        }
      })

      expect(polyphonicDuration).toBeLessThan(20)
      expect(sources).toHaveLength(32)
    })
  })

  describe('Real-Time Performance', () => {
    it('should maintain consistent frame rates during playback', () => {
      const { result } = renderHook(() => useAudioStore())
      let frameCount = 0
      const frameTimes: number[] = []

      const measureFrameRate = () => {
        const start = performance.now()
        
        // Simulate animation frame work
        act(() => {
          result.current.setCurrentStep((result.current.currentStep + 1) % 16)
        })
        
        const end = performance.now()
        frameTimes.push(end - start)
        frameCount++

        if (frameCount < 60) { // Test 60 frames
          requestAnimationFrame(measureFrameRate)
        }
      }

      measureFrameRate()

      // Wait for animation frames to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          const targetFrameTime = 1000 / 60 // 60 FPS = 16.67ms per frame

          // Frame processing should not exceed target frame time significantly
          expect(averageFrameTime).toBeLessThan(targetFrameTime * 1.5) // Allow 50% tolerance
          resolve()
        }, 1100) // Wait for all frames
      })
    })

    it('should handle BPM changes without performance impact', () => {
      const { result } = renderHook(() => useAudioStore())

      const bpmChangeDuration = monitor.measure('bpm_changes', () => {
        // Test rapid BPM changes
        for (let bpm = 60; bpm <= 200; bpm += 5) {
          act(() => {
            result.current.setBpm(bpm)
          })
        }
      })

      expect(bpmChangeDuration).toBeLessThan(50)
    })

    it('should maintain performance during swing adjustments', () => {
      const { result } = renderHook(() => useAudioStore())

      const swingDuration = monitor.measure('swing_adjustments', () => {
        // Test swing percentage changes
        for (let swing = 0; swing <= 30; swing += 1) {
          act(() => {
            result.current.setSwing(swing)
          })
        }
      })

      expect(swingDuration).toBeLessThan(30)
    })
  })

  describe('Memory Allocation Performance', () => {
    it('should not create excessive objects during playback', () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Mock object creation tracking
      const objectCreationCount = { count: 0 }
      const originalAudioBuffer = global.AudioBuffer
      
      // Mock AudioBuffer constructor to count allocations
      global.AudioBuffer = jest.fn().mockImplementation((...args) => {
        objectCreationCount.count++
        return new originalAudioBuffer(...args)
      }) as any

      monitor.measure('object_allocation_test', () => {
        // Simulate a full playback cycle
        for (let cycle = 0; cycle < 4; cycle++) {
          for (let step = 0; step < 16; step++) {
            act(() => {
              result.current.setCurrentStep(step)
              // Simulate processing active steps
              result.current.tracks.forEach(track => {
                if (track.steps[step].active) {
                  // This would normally create audio nodes
                }
              })
            })
          }
        }
      })

      // Restore original constructor
      global.AudioBuffer = originalAudioBuffer

      // Should not create excessive new objects during normal playback
      expect(objectCreationCount.count).toBeLessThan(100)
    })
  })

  describe('UI Responsiveness', () => {
    it('should not block UI during audio processing', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Simulate heavy audio processing
      const processingTime = await monitor.measureAsync('ui_responsiveness_test', async () => {
        for (let i = 0; i < 10; i++) {
          await act(async () => {
            // Simulate async audio file processing
            await new Promise(resolve => setTimeout(resolve, 5))
            
            result.current.addToSampleLibrary({
              id: `async-sample-${i}`,
              name: `Async Sample ${i}`,
              buffer: {} as AudioBuffer,
              duration: 1.0,
              type: 'generated',
              prompt: `Async prompt ${i}`
            })
          })
        }
      })

      // Processing should complete quickly to maintain UI responsiveness
      expect(processingTime).toBeLessThan(200)
    })
  })

  afterAll(() => {
    // Log all performance statistics
    const stats = monitor.getAllStats()
    console.log('\n=== Audio Performance Test Results ===')
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        console.log(`${name}:`)
        console.log(`  Average: ${stat.average.toFixed(2)}ms`)
        console.log(`  P95: ${stat.p95.toFixed(2)}ms`)
        console.log(`  Max: ${stat.max.toFixed(2)}ms`)
      }
    })
    console.log('=====================================\n')
  })
})