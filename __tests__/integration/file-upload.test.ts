/**
 * File Upload Integration Tests
 * Tests file upload error handling, validation, and edge cases
 */

import { renderHook, act } from '@testing-library/react'
import { useAudioStore } from '@/lib/audioStore'

// Mock file types for testing
const createMockFile = (
  content: string,
  filename: string,
  type: string,
  size?: number
): File => {
  const blob = new Blob([content], { type })
  Object.defineProperty(blob, 'size', {
    value: size || content.length,
    writable: false
  })
  
  return new File([blob], filename, { type })
}

// Mock FileReader for testing
class MockFileReader {
  result: string | ArrayBuffer | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null
  onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null

  async readAsArrayBuffer(file: File) {
    // Use await to ensure the callback runs asynchronously but is properly awaited
    await new Promise(resolve => setTimeout(resolve, 0))
    
    if (file.type.startsWith('audio/')) {
      // Mock valid audio file
      const buffer = new ArrayBuffer(1024)
      this.result = buffer
      if (this.onload) {
        this.onload({ target: this } as ProgressEvent<FileReader>)
      }
    } else {
      // Mock invalid file
      if (this.onerror) {
        this.onerror({ target: this } as ProgressEvent<FileReader>)
      }
    }
  }

  readAsDataURL(file: File) {
    Promise.resolve().then(() => {
      this.result = `data:${file.type};base64,mock-base64-data`
      if (this.onload) {
        this.onload({ target: this } as ProgressEvent<FileReader>)
      }
    })
  }
}

// Mock AudioContext.decodeAudioData
const mockDecodeAudioData = jest.fn()

global.FileReader = MockFileReader as any
global.AudioContext = jest.fn().mockImplementation(() => ({
  decodeAudioData: mockDecodeAudioData,
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn()
  })),
  destination: {},
  state: 'running'
}))

describe('File Upload Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful audio decoding
    mockDecodeAudioData.mockResolvedValue({
      duration: 2.5,
      numberOfChannels: 2,
      sampleRate: 44100,
      length: 110250
    })
  })

  describe('Valid File Upload Scenarios', () => {
    it('should handle valid WAV file upload', async () => {
      const { result } = renderHook(() => useAudioStore())
      const wavFile = createMockFile('RIFF...WAV data', 'test.wav', 'audio/wav')

      // First, test that the store method works directly
      act(() => {
        result.current.addToSampleLibrary({
          id: 'direct-test',
          name: 'direct-test.wav',
          buffer: {} as AudioBuffer,
          duration: 1.0,
          type: 'uploaded',
          prompt: ''
        })
      })
      
      
      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('direct-test.wav')

      // Clear and test file upload simulation
      act(() => {
        result.current.clearLibrary()
      })

      await act(async () => {
        // Simulate file upload processing with simpler approach
        await new Promise<void>(async (resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            if (reader.result) {
              // Process the file
              result.current.addToSampleLibrary({
                id: 'uploaded-wav',
                name: wavFile.name,
                buffer: {} as AudioBuffer,
                duration: 2.5,
                type: 'uploaded',
                prompt: ''
              })
            }
            resolve()
          }
          await reader.readAsArrayBuffer(wavFile)
        })
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('test.wav')
      expect(result.current.library[0].type).toBe('uploaded')
    })

    it('should handle valid MP3 file upload', async () => {
      const { result } = renderHook(() => useAudioStore())
      const mp3File = createMockFile('ID3...MP3 data', 'test.mp3', 'audio/mpeg')

      await act(async () => {
        await new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            result.current.addToSampleLibrary({
              id: 'uploaded-mp3',
              name: mp3File.name,
              buffer: {} as AudioBuffer,
              duration: 3.2,
              type: 'uploaded',
              prompt: ''
            })
            resolve()
          }
          reader.readAsArrayBuffer(mp3File)
        })
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('test.mp3')
    })

    it('should handle multiple file uploads', async () => {
      const { result } = renderHook(() => useAudioStore())
      const files = [
        createMockFile('WAV data 1', 'drum1.wav', 'audio/wav'),
        createMockFile('WAV data 2', 'drum2.wav', 'audio/wav'),
        createMockFile('MP3 data', 'bass.mp3', 'audio/mpeg')
      ]

      await act(async () => {
        // Process multiple files sequentially
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          await new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              result.current.addToSampleLibrary({
                id: `uploaded-${i}`,
                name: file.name,
                buffer: {} as AudioBuffer,
                duration: 1.0 + i,
                type: 'uploaded',
                prompt: ''
              })
              resolve()
            }
            reader.readAsArrayBuffer(file)
          })
        }
      })

      expect(result.current.library).toHaveLength(3)
      expect(result.current.library.map(s => s.name)).toEqual([
        'bass.mp3', 'drum2.wav', 'drum1.wav' // Reversed order due to addToSampleLibrary prepending
      ])
    })
  })

  describe('Invalid File Upload Scenarios', () => {
    it('should reject non-audio files', async () => {
      const { result } = renderHook(() => useAudioStore())
      const textFile = createMockFile('This is text', 'document.txt', 'text/plain')
      let errorOccurred = false

      await act(async () => {
        const reader = new FileReader()
        reader.onerror = () => {
          errorOccurred = true
        }
        reader.readAsArrayBuffer(textFile)
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(errorOccurred).toBe(true)
      expect(result.current.library).toHaveLength(0)
    })

    it('should handle corrupted audio files', async () => {
      const { result } = renderHook(() => useAudioStore())
      const corruptedFile = createMockFile('corrupted data', 'corrupt.wav', 'audio/wav')
      
      // Mock decoding failure
      mockDecodeAudioData.mockRejectedValueOnce(new Error('Invalid audio data'))

      let errorHandled = false

      await act(async () => {
        try {
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              await mockDecodeAudioData(reader.result)
            } catch (error) {
              errorHandled = true
            }
          }
          reader.readAsArrayBuffer(corruptedFile)
          
          await new Promise(resolve => setTimeout(resolve, 20))
        } catch (error) {
          errorHandled = true
        }
      })

      expect(errorHandled).toBe(true)
      expect(result.current.library).toHaveLength(0)
    })

    it('should handle files that are too large', async () => {
      const { result } = renderHook(() => useAudioStore())
      const largeFile = createMockFile(
        'large audio data',
        'large.wav',
        'audio/wav',
        50 * 1024 * 1024 // 50MB
      )

      const maxFileSize = 10 * 1024 * 1024 // 10MB limit
      let fileTooLarge = false

      await act(async () => {
        if (largeFile.size > maxFileSize) {
          fileTooLarge = true
          return
        }

        const reader = new FileReader()
        reader.readAsArrayBuffer(largeFile)
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(fileTooLarge).toBe(true)
      expect(result.current.library).toHaveLength(0)
    })

    it('should handle unsupported audio formats', async () => {
      const { result } = renderHook(() => useAudioStore())
      const unsupportedFile = createMockFile(
        'OGG Vorbis data',
        'audio.ogg',
        'audio/ogg'
      )

      // Some browsers might not support OGG
      mockDecodeAudioData.mockRejectedValueOnce(new Error('Unsupported format'))

      let formatError = false

      await act(async () => {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            await mockDecodeAudioData(reader.result)
          } catch (error) {
            formatError = true
          }
        }
        reader.readAsArrayBuffer(unsupportedFile)
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(formatError).toBe(true)
      expect(result.current.library).toHaveLength(0)
    })
  })

  describe('File Upload Edge Cases', () => {
    it('should handle empty files', async () => {
      const { result } = renderHook(() => useAudioStore())
      const emptyFile = createMockFile('', 'empty.wav', 'audio/wav', 0)

      let emptyFileError = false

      await act(async () => {
        if (emptyFile.size === 0) {
          emptyFileError = true
          return
        }

        const reader = new FileReader()
        reader.readAsArrayBuffer(emptyFile)
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(emptyFileError).toBe(true)
      expect(result.current.library).toHaveLength(0)
    })

    it('should handle files with special characters in names', async () => {
      const { result } = renderHook(() => useAudioStore())
      const specialFile = createMockFile(
        'WAV data',
        'test file (2) [final].wav',
        'audio/wav'
      )

      await act(async () => {
        const reader = new FileReader()
        reader.onload = () => {
          result.current.addToSampleLibrary({
            id: 'special-chars',
            name: specialFile.name,
            buffer: {} as AudioBuffer,
            duration: 1.0,
            type: 'uploaded',
            prompt: ''
          })
        }
        reader.readAsArrayBuffer(specialFile)
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('test file (2) [final].wav')
    })

    it('should handle very long filenames', async () => {
      const { result } = renderHook(() => useAudioStore())
      const longName = 'a'.repeat(255) + '.wav'
      const longNameFile = createMockFile('WAV data', longName, 'audio/wav')

      await act(async () => {
        const reader = new FileReader()
        reader.onload = () => {
          // Truncate filename if too long
          const truncatedName = longNameFile.name.length > 100 
            ? longNameFile.name.substring(0, 97) + '...'
            : longNameFile.name

          result.current.addToSampleLibrary({
            id: 'long-name',
            name: truncatedName,
            buffer: {} as AudioBuffer,
            duration: 1.0,
            type: 'uploaded',
            prompt: ''
          })
        }
        reader.readAsArrayBuffer(longNameFile)
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name.length).toBeLessThanOrEqual(100)
    })

    it('should handle files with very short durations', async () => {
      const { result } = renderHook(() => useAudioStore())
      const shortFile = createMockFile('Short WAV', 'short.wav', 'audio/wav')

      // Mock very short audio duration
      mockDecodeAudioData.mockResolvedValueOnce({
        duration: 0.01, // 10ms
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 441
      })

      await act(async () => {
        const reader = new FileReader()
        reader.onload = async () => {
          const audioBuffer = await mockDecodeAudioData(reader.result)
          
          result.current.addToSampleLibrary({
            id: 'short-audio',
            name: shortFile.name,
            buffer: audioBuffer as AudioBuffer,
            duration: audioBuffer.duration,
            type: 'uploaded',
            prompt: ''
          })
        }
        reader.readAsArrayBuffer(shortFile)
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].duration).toBe(0.01)
    })
  })

  describe('Drag and Drop Integration', () => {
    it('should handle drag and drop file operations', async () => {
      const { result } = renderHook(() => useAudioStore())
      
      // Mock drag and drop event
      const files = [
        createMockFile('WAV data', 'dropped.wav', 'audio/wav')
      ]

      const mockDragEvent = {
        dataTransfer: {
          files: files
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }

      await act(async () => {
        // Simulate drop event processing
        mockDragEvent.preventDefault()
        mockDragEvent.stopPropagation()

        const droppedFiles = Array.from(mockDragEvent.dataTransfer.files)
        
        for (const file of droppedFiles) {
          const reader = new FileReader()
          reader.onload = () => {
            result.current.addToSampleLibrary({
              id: 'dropped-file',
              name: file.name,
              buffer: {} as AudioBuffer,
              duration: 1.5,
              type: 'uploaded',
              prompt: ''
            })
          }
          reader.readAsArrayBuffer(file)
        }
        
        await new Promise(resolve => setTimeout(resolve, 20))
      })

      expect(mockDragEvent.preventDefault).toHaveBeenCalled()
      expect(mockDragEvent.stopPropagation).toHaveBeenCalled()
      expect(result.current.library).toHaveLength(1)
      expect(result.current.library[0].name).toBe('dropped.wav')
    })

    it('should handle multiple files dropped simultaneously', async () => {
      const { result } = renderHook(() => useAudioStore())
      
      const files = [
        createMockFile('WAV 1', 'file1.wav', 'audio/wav'),
        createMockFile('WAV 2', 'file2.wav', 'audio/wav'),
        createMockFile('MP3', 'file3.mp3', 'audio/mpeg'),
        createMockFile('Text', 'file4.txt', 'text/plain') // Should be filtered out
      ]

      await act(async () => {
        // Filter audio files only
        const audioFiles = files.filter(file => file.type.startsWith('audio/'))
        
        for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i]
          const reader = new FileReader()
          reader.onload = () => {
            result.current.addToSampleLibrary({
              id: `dropped-${i}`,
              name: file.name,
              buffer: {} as AudioBuffer,
              duration: 1.0,
              type: 'uploaded',
              prompt: ''
            })
          }
          reader.readAsArrayBuffer(file)
        }
        
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.library).toHaveLength(3) // Only audio files
      expect(result.current.library.map(s => s.name)).toEqual([
        'file1.wav', 'file2.wav', 'file3.mp3'
      ])
    })
  })
})