import '@testing-library/jest-dom'

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn(),
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
  })),
  decodeAudioData: jest.fn(() => Promise.resolve({
    duration: 1.0,
    numberOfChannels: 1,
    sampleRate: 44100,
  })),
  destination: {},
  currentTime: 0,
  resume: jest.fn(() => Promise.resolve()),
  state: 'running',
}))

global.webkitAudioContext = global.AudioContext

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = jest.fn()

// Mock crypto for random ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

// Mock atob/btoa for base64 operations
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'))
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'))