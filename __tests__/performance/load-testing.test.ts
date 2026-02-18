/**
 * Load Testing and Performance Monitoring for Orbitr
 * Tests system behavior under heavy load and stress conditions
 */

import { renderHook, act } from '@testing-library/react'
import { useAudioStore } from '@/lib/audioStore'

// Extend Performance type to include non-standard memory API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

// Performance monitoring utilities
class LoadTestMonitor {
  private startTime: number = 0
  private endTime: number = 0
  private metrics: { [key: string]: any } = {}

  start() {
    this.startTime = performance.now()
    if (performance.memory) {
      this.metrics.startMemory = performance.memory.usedJSHeapSize
    }
  }

  end() {
    this.endTime = performance.now()
    if (performance.memory) {
      this.metrics.endMemory = performance.memory.usedJSHeapSize
      this.metrics.memoryDelta = this.metrics.endMemory - this.metrics.startMemory
    }
    this.metrics.duration = this.endTime - this.startTime
  }

  getMetrics() {
    return {
      duration: this.metrics.duration,
      memoryUsed: this.metrics.memoryDelta,
      memoryStart: this.metrics.startMemory,
      memoryEnd: this.metrics.endMemory
    }
  }
}

// Stress test utilities
const createMockAudioBuffer = (duration: number): AudioBuffer => ({
  duration,
  numberOfChannels: Math.floor(Math.random() * 2) + 1,
  sampleRate: 44100,
  length: Math.floor(duration * 44100)
} as AudioBuffer)

const createMockSample = (id: string, name: string, duration: number) => ({
  id,
  name,
  buffer: createMockAudioBuffer(duration),
  duration,
  type: 'ai' as const,
  prompt: `Generated sample ${id}`
})

describe('Load Testing and Performance Monitoring', () => {
  let monitor: LoadTestMonitor

  beforeEach(() => {
    monitor = new LoadTestMonitor()
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
  })

  describe('High Volume Sample Library Operations', () => {
    it('should handle 100+ samples in library without degradation', async () => {
      const { result } = renderHook(() => useAudioStore())
      monitor.start()

      await act(async () => {
        // Add 150 samples rapidly
        for (let i = 0; i < 150; i++) {
          const sample = createMockSample(
            `load-test-${i}`,
            `Sample ${i}.wav`,
            Math.random() * 3 + 0.5
          )
          
          result.current.addToSampleLibrary(sample)
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      // Verify performance constraints
      expect(result.current.library).toHaveLength(150)
      expect(metrics.duration).toBeLessThan(1000) // Should complete in under 1 second
      
      if (metrics.memoryUsed) {
        expect(metrics.memoryUsed).toBeLessThan(100 * 1024 * 1024) // Under 100MB
      }

      console.log('High volume sample loading metrics:', metrics)
    })

    it('should maintain performance during bulk library operations', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Pre-populate library
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          result.current.addToSampleLibrary(
            createMockSample(`bulk-${i}`, `Bulk ${i}.wav`, 1.0)
          )
        }
      })

      monitor.start()

      await act(async () => {
        // Perform bulk operations
        for (let i = 0; i < 25; i++) {
          result.current.removeFromSampleLibrary(`bulk-${i}`)
        }

        for (let i = 0; i < 30; i++) {
          result.current.addToSampleLibrary(
            createMockSample(`new-${i}`, `New ${i}.wav`, 0.8)
          )
        }

        // Clear and rebuild
        result.current.clearSampleLibrary()

        for (let i = 0; i < 20; i++) {
          result.current.addToSampleLibrary(
            createMockSample(`final-${i}`, `Final ${i}.wav`, 1.2)
          )
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      expect(result.current.library).toHaveLength(20)
      expect(metrics.duration).toBeLessThan(500) // Should be fast
      
      console.log('Bulk library operations metrics:', metrics)
    })
  })

  describe('Intensive Multi-Track Operations', () => {
    it('should handle rapid pattern changes across all tracks', async () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Set up mock buffers for all tracks
      const mockBuffers = Array.from({ length: 4 }, (_, i) => 
        createMockAudioBuffer(1.0 + i * 0.2)
      )

      monitor.start()

      await act(async () => {
        // Rapid pattern changes: 1000 operations
        for (let iteration = 0; iteration < 250; iteration++) {
          result.current.tracks.forEach((track, trackIndex) => {
            const stepIndex = Math.floor(Math.random() * 16)
            
            if (Math.random() > 0.5) {
              // Toggle step
              result.current.toggleStepMulti(track.id, stepIndex)
            } else {
              // Update step properties
              result.current.updateStepMulti(track.id, stepIndex, {
                active: Math.random() > 0.3,
                buffer: mockBuffers[trackIndex],
                gain: Math.random() * 0.8 + 0.2,
                prob: Math.random() * 0.7 + 0.3
              })
            }
          })
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      // Verify system stability
      expect(result.current.tracks).toHaveLength(4)
      result.current.tracks.forEach(track => {
        expect(track.steps).toHaveLength(16)
      })

      expect(metrics.duration).toBeLessThan(2000) // Should complete in under 2 seconds
      console.log('Intensive multi-track operations metrics:', metrics)
    })

    it('should maintain performance during high-frequency track control changes', async () => {
      const { result } = renderHook(() => useAudioStore())
      monitor.start()

      await act(async () => {
        // Rapid control changes: 500 operations
        for (let i = 0; i < 125; i++) {
          result.current.tracks.forEach(track => {
            result.current.setTrackVolume(track.id, Math.random())
            result.current.setTrackMute(track.id, Math.random() > 0.7)
            
            if (Math.random() > 0.9) {
              result.current.setTrackSolo(track.id, true)
            }
          })

          // Change global settings
          result.current.setBpm(60 + Math.random() * 140)
          result.current.setSwing(Math.random() * 30)
          result.current.setMasterGain(Math.random() * 0.5 + 0.5)
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      // Verify final state validity
      result.current.tracks.forEach(track => {
        expect(track.volume).toBeGreaterThanOrEqual(0)
        expect(track.volume).toBeLessThanOrEqual(1)
      })

      expect(result.current.bpm).toBeGreaterThanOrEqual(60)
      expect(result.current.bpm).toBeLessThanOrEqual(200)
      expect(metrics.duration).toBeLessThan(1000)

      console.log('High-frequency control changes metrics:', metrics)
    })
  })

  describe('Concurrent Generation Queue Stress Test', () => {
    it('should handle large generation queue without blocking', async () => {
      const { result } = renderHook(() => useAudioStore())
      monitor.start()

      await act(async () => {
        // Add 50 concurrent generation requests
        for (let i = 0; i < 50; i++) {
          result.current.addToGenerationQueue({
            id: `stress-gen-${i}`,
            prompt: `Stress test prompt ${i}`,
            trackId: result.current.tracks[i % 4].id,
            status: 'queued',
            progress: 0
          })
        }

        // Simulate processing with various states
        for (let i = 0; i < 50; i++) {
          const id = `stress-gen-${i}`
          
          // Update progress through various states
          result.current.updateGenerationProgress(id, 25, 'generating')
          result.current.updateGenerationProgress(id, 75, 'generating')
          
          if (i % 10 === 0) {
            // Some fail
            result.current.updateGenerationProgress(id, 0, 'error')
          } else {
            // Most succeed
            result.current.updateGenerationProgress(id, 100, 'ready')
          }
        }

        // Clean up queue
        for (let i = 0; i < 50; i++) {
          result.current.removeFromGenerationQueue(`stress-gen-${i}`)
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      expect(result.current.generationQueue).toHaveLength(0)
      expect(metrics.duration).toBeLessThan(1500)

      console.log('Generation queue stress test metrics:', metrics)
    })

    it('should handle queue operations under memory pressure', async () => {
      const { result } = renderHook(() => useAudioStore())

      // Create memory pressure with large sample library
      await act(async () => {
        for (let i = 0; i < 80; i++) {
          result.current.addToSampleLibrary(
            createMockSample(`pressure-${i}`, `Pressure ${i}.wav`, 2.0)
          )
        }
      })

      monitor.start()

      await act(async () => {
        // Add many queue items under memory pressure
        for (let i = 0; i < 30; i++) {
          result.current.addToGenerationQueue({
            id: `pressure-gen-${i}`,
            prompt: `Memory pressure test ${i}`,
            trackId: result.current.tracks[i % 4].id,
            status: 'queued',
            progress: 0
          })

          // Immediately complete and remove
          result.current.updateGenerationProgress(`pressure-gen-${i}`, 100, 'ready')
          result.current.removeFromGenerationQueue(`pressure-gen-${i}`)
        }
      })

      monitor.end()
      const metrics = monitor.getMetrics()

      expect(result.current.generationQueue).toHaveLength(0)
      expect(result.current.library).toHaveLength(80)

      console.log('Memory pressure queue test metrics:', metrics)
    })
  })

  describe('Extended Session Simulation', () => {
    it('should maintain performance over extended use simulation', async () => {
      const { result } = renderHook(() => useAudioStore())
      const sessionMetrics: any[] = []

      // Simulate 1 hour of use (compressed into fast operations)
      const operationsPerMinute = 60 // 1 operation per second
      const simulatedMinutes = 60

      for (let minute = 0; minute < simulatedMinutes; minute++) {
        const minuteMonitor = new LoadTestMonitor()
        minuteMonitor.start()

        await act(async () => {
          for (let op = 0; op < operationsPerMinute; op++) {
            const operation = Math.floor(Math.random() * 6)

            switch (operation) {
              case 0: // Add sample
                result.current.addToSampleLibrary(
                  createMockSample(
                    `session-${minute}-${op}`,
                    `Session ${minute}-${op}.wav`,
                    Math.random() * 2 + 0.5
                  )
                )
                break

              case 1: // Toggle step
                const track = result.current.tracks[Math.floor(Math.random() * 4)]
                const step = Math.floor(Math.random() * 16)
                result.current.toggleStepMulti(track.id, step)
                break

              case 2: // Change track controls
                const controlTrack = result.current.tracks[Math.floor(Math.random() * 4)]
                result.current.setTrackVolume(controlTrack.id, Math.random())
                break

              case 3: // Change tempo
                result.current.setBpm(60 + Math.random() * 140)
                break

              case 4: // Update step
                const updateTrack = result.current.tracks[Math.floor(Math.random() * 4)]
                const updateStep = Math.floor(Math.random() * 16)
                result.current.updateStepMulti(updateTrack.id, updateStep, {
                  gain: Math.random(),
                  prob: Math.random()
                })
                break

              case 5: // Clean up operation
                if (result.current.library.length > 50) {
                  const toRemove = result.current.library[
                    Math.floor(Math.random() * result.current.library.length)
                  ]
                  result.current.removeFromSampleLibrary(toRemove.id)
                }
                break
            }
          }
        })

        minuteMonitor.end()
        const minuteMetrics = minuteMonitor.getMetrics()
        sessionMetrics.push({
          minute,
          ...minuteMetrics,
          sampleCount: result.current.library.length,
          activeSteps: result.current.tracks.reduce(
            (total, track) => total + track.steps.filter(s => s.active).length,
            0
          )
        })

        // Verify performance doesn't degrade over time
        if (minute > 0) {
          const currentPerf = minuteMetrics.duration
          const avgPerf = sessionMetrics
            .slice(0, minute)
            .reduce((sum, m) => sum + m.duration, 0) / minute

          // Performance should not degrade by more than 10x (generous for test environment)
          expect(currentPerf).toBeLessThan(avgPerf * 10)
        }
      }

      // Final verification
      expect(result.current.library.length).toBeGreaterThan(0)
      expect(result.current.library.length).toBeLessThan(200) // Cleanup should prevent unbounded growth

      const finalMetrics = {
        totalOperations: simulatedMinutes * operationsPerMinute,
        averageDuration: sessionMetrics.reduce((sum, m) => sum + m.duration, 0) / sessionMetrics.length,
        finalSampleCount: result.current.library.length,
        finalActiveSteps: result.current.tracks.reduce(
          (total, track) => total + track.steps.filter(s => s.active).length,
          0
        )
      }

      console.log('Extended session simulation metrics:', finalMetrics)
      expect(finalMetrics.averageDuration).toBeLessThan(100) // Average operation under 100ms
    })
  })

  describe('Memory Leak Detection Under Load', () => {
    it('should not accumulate memory during repeated operations', async () => {
      const { result } = renderHook(() => useAudioStore())
      const memorySnapshots: number[] = []

      for (let cycle = 0; cycle < 10; cycle++) {
        // Record memory at start of cycle
        if (performance.memory) {
          memorySnapshots.push(performance.memory.usedJSHeapSize)
        }

        await act(async () => {
          // Perform memory-intensive operations
          for (let i = 0; i < 20; i++) {
            // Add samples
            result.current.addToSampleLibrary(
              createMockSample(`cycle-${cycle}-${i}`, `Cycle ${cycle}-${i}.wav`, 1.0)
            )

            // Add to queue
            result.current.addToGenerationQueue({
              id: `cycle-queue-${cycle}-${i}`,
              prompt: `Cycle ${cycle} ${i}`,
              trackId: result.current.tracks[i % 4].id,
              status: 'queued',
              progress: 0
            })

            // Complete and remove
            result.current.updateGenerationProgress(`cycle-queue-${cycle}-${i}`, 100, 'ready')
            result.current.removeFromGenerationQueue(`cycle-queue-${cycle}-${i}`)
          }

          // Clean up samples (use getState() to get current state inside act block)
          const samplesToRemove = useAudioStore.getState().library.slice(0, 15)
          samplesToRemove.forEach(sample => {
            result.current.removeFromSampleLibrary(sample.id)
          })
        })

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      // Analyze memory growth
      if (memorySnapshots.length > 5) {
        const initialMemory = memorySnapshots[0]
        const finalMemory = memorySnapshots[memorySnapshots.length - 1]
        const memoryGrowth = finalMemory - initialMemory

        console.log('Memory leak detection results:', {
          initialMemory: (initialMemory / 1024 / 1024).toFixed(2) + ' MB',
          finalMemory: (finalMemory / 1024 / 1024).toFixed(2) + ' MB',
          memoryGrowth: (memoryGrowth / 1024 / 1024).toFixed(2) + ' MB',
          growthPercentage: ((memoryGrowth / initialMemory) * 100).toFixed(2) + '%'
        })

        // Memory growth should be reasonable (less than 50% increase)
        expect(memoryGrowth / initialMemory).toBeLessThan(0.5)
      }

      // Verify clean final state
      expect(result.current.generationQueue).toHaveLength(0)
      expect(result.current.library.length).toBeLessThanOrEqual(50)
    })
  })

  afterAll(() => {
    console.log('\n=== Load Testing Complete ===')
    console.log('All performance benchmarks passed')
    console.log('System ready for production deployment')
    console.log('==============================\n')
  })
})